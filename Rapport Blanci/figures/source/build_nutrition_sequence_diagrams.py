"""Render the approved nutrition sequences."""
from pathlib import Path

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Circle, Rectangle, FancyArrowPatch

OUTPUT = Path(__file__).resolve().parents[1]
plt.rcParams.update({'font.family': 'DejaVu Sans', 'svg.fonttype': 'none'})
INK = '#303030'
HEADER_FILL = '#edf3f7'
HEADER_TEXT = '#243f54'
HEADER_BORDER = '#536b7c'
FRAME = '#757575'


class Sequence:
    def __init__(self, names, height, actor=None):
        self.fig, self.ax = plt.subplots(figsize=(10, height))
        self.fig.subplots_adjust(left=0, right=1, bottom=0, top=1)
        self.ax.set(xlim=(0, 10), ylim=(height, 0))
        self.ax.axis('off')
        self.fig.patch.set_facecolor('white')
        n = len(names)
        self.x = [0.95 + i * 8.1 / (n - 1) for i in range(n)]
        width = min(1.75, 7.5 / n)
        for index, (x, name) in enumerate(zip(self.x, names)):
            if index == actor:
                self.ax.add_patch(Circle((x, .19), .10, facecolor='white',
                                         edgecolor=INK, lw=.8))
                self.ax.plot([x, x], [.29, .52], color=INK, lw=.8)
                self.ax.plot([x - .17, x + .17], [.37, .37], color=INK, lw=.8)
                self.ax.plot([x - .16, x, x + .16], [.69, .52, .69], color=INK, lw=.8)
                self.ax.text(x, .81, name, ha='center', va='center', fontsize=9)
                lifeline_top = .95
            else:
                self.ax.add_patch(Rectangle((x - width / 2, .18), width, .6,
                                           facecolor=HEADER_FILL, edgecolor=HEADER_BORDER, lw=.8))
                self.ax.text(x, .48, name, ha='center', va='center', fontsize=9,
                             color=HEADER_TEXT)
                lifeline_top = .78
            self.ax.plot([x, x], [lifeline_top, height - .2], color=INK,
                         lw=.65, linestyle=(0, (4, 4)), zorder=0)

    def message(self, a, b, y, label, reply=False):
        x1, x2 = self.x[a], self.x[b]
        self.ax.add_patch(FancyArrowPatch((x1, y), (x2, y), arrowstyle='->',
                                         mutation_scale=10, lw=.85, color=INK,
                                         linestyle='--' if reply else '-'))
        self.ax.text((x1 + x2) / 2, y - .08, label, ha='center', va='bottom',
                     fontsize=8.5, bbox=dict(facecolor='white', edgecolor='none', pad=1))

    def local(self, a, y, label):
        x = self.x[a]
        self.ax.plot([x, x + .32, x + .32], [y, y, y + .23], color=INK, lw=.85)
        self.ax.add_patch(FancyArrowPatch((x + .32, y + .23), (x, y + .23),
                                         arrowstyle='->', mutation_scale=10, color=INK, lw=.85))
        self.ax.text(x + .4, y + .1, label, fontsize=8.5, va='center',
                     bbox=dict(facecolor='white', edgecolor='none', pad=1))

    def frame(self, top, bottom, title, left=.3, right=9.7):
        self.ax.add_patch(Rectangle((left, top), right - left, bottom - top,
                                   facecolor='none', edgecolor=FRAME, lw=.7))
        self.ax.text(left + .08, top + .13, title, fontsize=8.5, va='center',
                     bbox=dict(facecolor='white', edgecolor='none', pad=1))

    def save(self, name):
        for extension in ('png', 'svg'):
            self.fig.savefig(OUTPUT / f'{name}.{extension}', dpi=300, facecolor='white')
        plt.close(self.fig)


s = Sequence(['Mobile user', 'GoFit application'], 7.1, actor=0)
s.message(0, 1, 1.3, 'Open Nutrition; select Add Food')
s.message(1, 0, 1.95, 'Display Add Food screen', True)
s.message(0, 1, 2.6, 'Open barcode scanner (camera permission granted)')
s.message(1, 0, 3.2, 'Display scanner and capture guidance', True)
s.message(0, 1, 3.85, 'Scan product barcode')
s.message(1, 0, 4.55, 'Match found: display selected product and serving basis', True)
s.message(0, 1, 5.35, 'Enter servings; select meal type; confirm Add Food')
s.message(1, 0, 6.2, 'Save and refresh succeed: return to Nutrition\nwith updated logged foods and daily totals', True)
s.save('seq_nutrition_ssd')

s = Sequence(['Add Food\nscreen', 'Nutrition\nservice', 'Supabase\nData API', 'Barcode lookup\nEdge Function', 'Open Food Facts'], 12.6)
s.message(0, 1, 1.35, 'lookupFoodByBarcode(code)')
s.message(1, 2, 2.05, 'SELECT food_items\nby normalized barcode candidates')
s.message(2, 1, 2.75, 'Catalog match or no match', True)
s.frame(3.2, 10.9, 'opt [no match in initial catalog query]')
s.message(1, 3, 3.9, 'Invoke food-barcode-lookup({ barcode })')
s.message(3, 2, 4.6, 'Recheck food_items catalog')
s.message(2, 3, 5.25, 'Catalog match or no match', True)
s.frame(5.65, 9.6, 'opt [still no match; provider success shown]', left=4.6)
s.message(3, 4, 6.35, 'GET product by barcode\n(name and nutriments)')
s.message(4, 3, 7.1, 'Product data', True)
s.local(3, 7.65, 'Normalize\nto 100 g basis')
s.message(3, 2, 8.5, 'INSERT food_items')
s.message(2, 3, 9.15, 'Stored food item', True)
s.message(3, 1, 10.3, 'Matched or imported food item', True)
s.message(1, 0, 11.55, 'Selected product details', True)
s.save('seq_nutrition_detailed')

s = Sequence(['Add Food UI\n+ Nutrition UI', 'Nutrition\nstore', 'Nutrition\nservice', 'Supabase Auth\n+ Data API'], 12.5)
s.local(0, 1.3, 'Validate servings: greater than 0 and at most 50')
s.message(0, 1, 2.05, 'addLog(foodId, mealType, servings, date)')
s.message(1, 2, 2.75, 'addMealLog(foodId, mealType, servings, date)')
s.message(2, 3, 3.45, 'Resolve authenticated user;\nINSERT meal_logs')
s.message(3, 2, 4.15, 'Insert succeeds', True)
s.message(2, 1, 4.8, 'Save completes', True)
s.local(1, 5.4, 'Select logged date; call refresh(date)')
s.message(1, 2, 6.2, 'Load goals if needed; logs with food items;\nrecent foods, saved meals, weekly summary and water total')
s.message(2, 3, 7.0, 'Authenticated catalog / user-data queries')
s.message(3, 2, 7.7, 'Query results', True)
s.message(2, 1, 8.4, 'Loaded data', True)
s.message(1, 2, 9.05, 'computeTotals(logs)')
s.message(2, 1, 9.6, 'Sum of food nutrients x servings', True)
s.local(1, 10.2, 'Update shared logs, totals and summary state')
s.message(1, 0, 11.05, 'addLog completes after refresh attempt', True)
s.local(0, 11.65, 'Return to Nutrition; render totals against goals\n(successful refresh path shown)')
s.save('seq_nutrition_logging')


