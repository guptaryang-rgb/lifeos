import { store, isToday } from './store.js';
import { toast } from './bus.js';
import { h, icon, chip, modal } from './utils.js';

export const meta = { title: 'Fitness & Nutrition', eyebrow: 'Body' };

export function render(root) {
  const foods = store.get('foodLogs') || [];
  const workouts = store.get('workouts') || [];

  // Today's totals
  const todaysFood = foods.filter(f => isToday(f.date));
  const totals = todaysFood.reduce((acc, f) => {
    acc.cal += f.calories || 0;
    acc.protein += f.protein || 0;
    acc.carbs += f.carbs || 0;
    acc.fat += f.fat || 0;
    return acc;
  }, { cal: 0, protein: 0, carbs: 0, fat: 0 });

  // Today's workouts
  const todaysWorkouts = workouts.filter(w => isToday(w.date));
  const burned = todaysWorkouts.reduce((s, w) => s + (w.calories || 0), 0);

  // Stats row
  const stats = h('div.grid.grid-4', {});
  stats.appendChild(statTile('Calories in', totals.cal, 'kcal'));
  stats.appendChild(statTile('Protein', totals.protein, 'g'));
  stats.appendChild(statTile('Burned', burned, 'kcal'));
  stats.appendChild(statTile('Net', totals.cal - burned, 'kcal'));
  root.appendChild(stats);

  // Two columns: meals | workouts
  const grid = h('div.grid.grid-2', { style: { marginTop: '24px', gridTemplateColumns: '1fr 1fr' } });

  // Meals column
  const mealsCard = h('div.card', {});
  mealsCard.appendChild(h('div.card-header', {},
    h('div.card-title', {}, icon('apple', 16), ' Today\'s meals'),
    h('button.btn.btn-sm.btn-primary', { onclick: () => openFood() }, icon('plus', 12), ' Log')
  ));
  const mealsList = h('div.list', {});
  if (todaysFood.length === 0) {
    mealsList.appendChild(h('div.empty', { style: { padding: '20px' } }, h('div.empty-icon', { style: { fontSize: '24px' } }, '🍽️'), h('div.empty-title', {}, 'No meals logged today')));
  } else {
    todaysFood.slice().reverse().forEach(f => {
      mealsList.appendChild(h('div.list-item', { onclick: () => removeFood(f.id) },
        h('div', { style: { width: 36, height: 36, borderRadius: 8, background: 'var(--bg-elev-2)', display: 'grid', placeItems: 'center', fontSize: '16px' } }, mealEmoji(f.meal)),
        h('div.list-item-title', {}, f.foodName),
        chip(`${f.calories} kcal · ${f.protein || 0}g P`, ''),
        h('div.list-item-meta', {}, f.meal),
      ));
    });
  }
  mealsCard.appendChild(mealsList);
  grid.appendChild(mealsCard);

  // Workouts column
  const workoutsCard = h('div.card', {});
  workoutsCard.appendChild(h('div.card-header', {},
    h('div.card-title', {}, icon('dumbbell', 16), ' Workouts'),
    h('button.btn.btn-sm.btn-primary', { onclick: () => openWorkout() }, icon('plus', 12), ' Log')
  ));
  const wList = h('div.list', {});
  if (workouts.length === 0) {
    wList.appendChild(h('div.empty', { style: { padding: '20px' } }, h('div.empty-icon', { style: { fontSize: '24px' } }, '💪'), h('div.empty-title', {}, 'No workouts yet')));
  } else {
    workouts.slice(-5).reverse().forEach(w => {
      wList.appendChild(h('div.list-item', { onclick: () => removeWorkout(w.id) },
        h('div', { style: { width: 36, height: 36, borderRadius: 8, background: w.type === 'cardio' ? 'rgba(108,252,193,0.15)' : 'rgba(176,124,255,0.15)', display: 'grid', placeItems: 'center' } }, w.type === 'cardio' ? '🏃' : '🏋️'),
        h('div.list-item-title', {}, w.exerciseName),
        chip(`${w.durationMinutes}m · ${w.calories} kcal`, ''),
        h('div.list-item-meta', {}, new Date(w.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
      ));
    });
  }
  workoutsCard.appendChild(wList);
  grid.appendChild(workoutsCard);

  root.appendChild(grid);

  // Macro donut
  root.appendChild(h('div.card', { style: { marginTop: '24px' } },
    h('div.card-header', {},
      h('div.card-title', {}, icon('layers', 16), ' Macro split — today'),
    ),
    h('div', { html: macroDonut(totals) }),
  ));
}

function statTile(label, value, suffix) {
  return h('div.card', {},
    h('div.stat', {},
      h('div.stat-label', {}, label),
      h('div.stat-value', {}, String(value), h('span.stat-suffix', {}, suffix))
    )
  );
}

function mealEmoji(m) {
  return { breakfast: '🥞', lunch: '🥗', dinner: '🍽️', snack: '🍎' }[m] || '🍴';
}

function macroDonut(t) {
  const total = (t.protein * 4) + (t.carbs * 4) + (t.fat * 9);
  if (total === 0) {
    return h('div.empty', { style: { padding: '20px' } }, h('div.empty-sub', {}, 'Log meals to see your macros.'));
  }
  const pPct = (t.protein * 4) / total;
  const cPct = (t.carbs * 4) / total;
  const fPct = (t.fat * 9) / total;
  const cx = 60, cy = 60, r = 50, stroke = 14;
  const C = 2 * Math.PI * r;
  const segs = [
    { pct: pPct, color: 'var(--aurora-cyan)',    label: 'Protein', val: Math.round(t.protein) + 'g' },
    { pct: cPct, color: 'var(--aurora-violet)',  label: 'Carbs',   val: Math.round(t.carbs)   + 'g' },
    { pct: fPct, color: 'var(--aurora-magenta)', label: 'Fat',     val: Math.round(t.fat)     + 'g' },
  ];

  const svg = `
    <svg viewBox="0 0 120 120" width="120" height="120">
      <circle cx="${cx}" cy="${cy}" r="${r}" stroke="var(--bg-elev-2)" stroke-width="${stroke}" fill="none"/>
      ${segs.reduce((acc, s, i) => {
        const dash = s.pct * C;
        const gap = C - dash;
        const offset = segs.slice(0, i).reduce((sum, x) => sum + x.pct * C, 0);
        acc += `<circle cx="${cx}" cy="${cy}" r="${r}" stroke="${s.color}" stroke-width="${stroke}" fill="none"
          stroke-dasharray="${dash} ${gap}" stroke-dashoffset="${-offset}" stroke-linecap="round"
          transform="rotate(-90 ${cx} ${cy})" style="filter:drop-shadow(0 0 6px ${s.color})"/>`;
        return acc;
      }, '')}
    </svg>
  `;
  const wrap = h('div.donut-wrap', { style: { position: 'relative' } });
  wrap.innerHTML = svg;
  wrap.appendChild(h('div.donut-center', { style: { position: 'absolute', top: '50%', left: '60px', transform: 'translate(-50%, -50%)', textAlign: 'center' } },
    h('div', { style: { fontFamily: 'var(--font-mono)', fontSize: '22px', fontWeight: 700 } }, Math.round(t.cal)),
    h('div.donut-center-label', {}, 'kcal'),
  ));
  const legend = h('div.donut-legend', {},
    ...segs.map(s => h('div.donut-legend-row', {},
      h('div.donut-legend-dot', { style: { background: s.color } }),
      h('div.donut-legend-label', {}, s.label),
      h('div.donut-legend-value', {}, s.val),
    ))
  );
  wrap.appendChild(legend);
  return wrap;
}

function openFood() {
  const name = h('input.field-input', { placeholder: 'e.g. Chicken bowl' });
  const cals = h('input.field-input', { type: 'number', placeholder: 'Calories', value: '450' });
  const protein = h('input.field-input', { type: 'number', placeholder: 'g', value: '30' });
  const carbs = h('input.field-input', { type: 'number', placeholder: 'g', value: '40' });
  const fat = h('input.field-input', { type: 'number', placeholder: 'g', value: '12' });
  const meal = h('select.field-select', {},
    h('option', { value: 'breakfast' }, 'Breakfast'),
    h('option', { value: 'lunch', selected: true }, 'Lunch'),
    h('option', { value: 'dinner' }, 'Dinner'),
    h('option', { value: 'snack' }, 'Snack'),
  );
  modal({
    title: 'Log meal',
    body: h('div', {},
      h('div.field', {}, h('div.field-label', {}, 'Food'), name),
      h('div.field-row', {},
        h('div.field', {}, h('div.field-label', {}, 'Calories'), cals),
        h('div.field', {}, h('div.field-label', {}, 'Protein'), protein),
      ),
      h('div.field-row', {},
        h('div.field', {}, h('div.field-label', {}, 'Carbs'), carbs),
        h('div.field', {}, h('div.field-label', {}, 'Fat'), fat),
      ),
      h('div.field', {}, h('div.field-label', {}, 'Meal'), meal),
    ),
    actions: [
      { label: 'Cancel', kind: 'ghost' },
      { label: 'Log', kind: 'primary', onClick: () => {
        if (!name.value.trim()) return;
        store.push('foodLogs', {
          id: Math.random().toString(36).slice(2),
          foodName: name.value.trim(),
          meal: meal.value,
          servingCount: 1,
          calories: parseInt(cals.value) || 0,
          protein: parseInt(protein.value) || 0,
          carbs: parseInt(carbs.value) || 0,
          fat: parseInt(fat.value) || 0,
          fiber: 0,
          date: new Date(), createdAt: Date.now(),
        });
        toast({ kind: 'success', title: 'Logged', body: name.value.trim() });
        rerender();
      } }
    ]
  });
}

function removeFood(id) {
  store.remove('foodLogs', id);
  toast({ kind: 'info', title: 'Removed' });
  rerender();
}

function openWorkout() {
  const name = h('input.field-input', { placeholder: 'e.g. Morning run' });
  const type = h('select.field-select', {},
    h('option', { value: 'cardio' }, 'Cardio'),
    h('option', { value: 'strength' }, 'Strength'),
  );
  const dur = h('input.field-input', { type: 'number', value: '30' });
  const cal = h('input.field-input', { type: 'number', value: '250' });
  modal({
    title: 'Log workout',
    body: h('div', {},
      h('div.field', {}, h('div.field-label', {}, 'Activity'), name),
      h('div.field-row', {},
        h('div.field', {}, h('div.field-label', {}, 'Type'), type),
        h('div.field', {}, h('div.field-label', {}, 'Duration'), dur),
      ),
      h('div.field', {}, h('div.field-label', {}, 'Calories'), cal),
    ),
    actions: [
      { label: 'Cancel', kind: 'ghost' },
      { label: 'Log', kind: 'primary', onClick: () => {
        if (!name.value.trim()) return;
        store.push('workouts', {
          id: Math.random().toString(36).slice(2),
          exerciseName: name.value.trim(),
          type: type.value,
          durationMinutes: parseInt(dur.value) || 30,
          calories: parseInt(cal.value) || 0,
          date: new Date(), createdAt: Date.now(),
        });
        toast({ kind: 'success', title: 'Logged', body: name.value.trim() });
        rerender();
      } }
    ]
  });
}

function removeWorkout(id) {
  store.remove('workouts', id);
  toast({ kind: 'info', title: 'Removed' });
  rerender();
}

function rerender() {
  const view = document.getElementById('view');
  view.innerHTML = '';
  const page = h('div.page', { dataset: { page: 'food' } });
  view.appendChild(page);
  render(page);
}

export function unmount() {}
