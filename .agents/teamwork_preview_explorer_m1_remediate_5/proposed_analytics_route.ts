import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { calculateBurnoutRisk } from '@/lib/heuristics';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  let email = session?.user?.email;
  if (!email) {
    email = req.cookies.get('session')?.value;
  }
  if (!email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userTasks = await prisma.task.findMany({
    where: { user: { email } }
  });
  const userFocus = await prisma.focusSession.findMany({
    where: { user: { email } }
  });
  const userHabits = await prisma.habit.findMany({
    where: { user: { email } },
    include: { logs: true }
  });

  // 1. Basic analytics calculations
  const totalFocusMins = userFocus.reduce((acc, f) => acc + f.duration, 0);
  const focusHours = (totalFocusMins / 60).toFixed(2);

  const completedTasks = userTasks.filter(t => t.status === 'COMPLETED').length;
  const taskCompletionRate = userTasks.length ? Math.round((completedTasks / userTasks.length) * 100) : 0;

  const totalLogs = userHabits.reduce((acc, h) => acc + h.logs.length, 0);
  const habitCompliance = userHabits.length ? Math.round((totalLogs / (userHabits.length * 30)) * 100) : 0;

  // 2. Dynamic heuristics parameters calculations
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  // workloadDensity: scheduled focus hours / available hours (assume 40 hours standard work week)
  const scheduledFocusHours = userTasks.filter(t => t.status !== 'COMPLETED').reduce((acc, t) => acc + t.estimatedDuration, 0) / 60;
  const availableHours = 40.0;
  const workloadDensity = Math.min(scheduledFocusHours / availableHours, 1.0);

  // missedTaskCount: overdue tasks count
  const missedTaskCount = userTasks.filter(t => t.status === 'OVERDUE').length;

  // streakDeclineRate: relative decline in habit logging between last 7 days and previous 7 days
  let totalDecline = 0.0;
  let habitCount = 0;
  for (const habit of userHabits) {
    const recentLogs = habit.logs.filter(log => {
      const d = new Date(log.completedAt);
      return d >= sevenDaysAgo && d <= now;
    }).length;
    
    const prevLogs = habit.logs.filter(log => {
      const d = new Date(log.completedAt);
      return d >= fourteenDaysAgo && d < sevenDaysAgo;
    }).length;
    
    const decline = prevLogs > recentLogs ? (prevLogs - recentLogs) / prevLogs : 0.0;
    totalDecline += decline;
    habitCount++;
  }
  const streakDeclineRate = habitCount > 0 ? totalDecline / habitCount : 0.0;

  // focusTimeTrend: relative change in focus hours between last 7 days and previous 7 days (-1 to 1)
  const recentFocusMins = userFocus.filter(session => {
    const d = new Date(session.startTime);
    return d >= sevenDaysAgo && d <= now;
  }).reduce((sum, s) => sum + s.duration, 0);

  const prevFocusMins = userFocus.filter(session => {
    const d = new Date(session.startTime);
    return d >= fourteenDaysAgo && d < sevenDaysAgo;
  }).reduce((sum, s) => sum + s.duration, 0);

  let focusTimeTrend = 0.0;
  if (prevFocusMins > 0) {
    focusTimeTrend = (recentFocusMins - prevFocusMins) / prevFocusMins;
  } else if (recentFocusMins > 0) {
    focusTimeTrend = 1.0;
  }
  focusTimeTrend = Math.max(-1.0, Math.min(1.0, focusTimeTrend));

  // 3. Call the authentic calculateBurnoutRisk heuristics function
  const { score: burnoutScore, recommendations } = calculateBurnoutRisk(
    workloadDensity,
    missedTaskCount,
    streakDeclineRate,
    focusTimeTrend
  );

  return NextResponse.json({
    focusHours,
    taskCompletionRate,
    habitCompliance,
    burnoutScore,
    recommendations
  });
}
