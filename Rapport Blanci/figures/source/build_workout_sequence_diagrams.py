"""Render the source-checked workout sequences as plain PNG and SVG figures."""
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


s = Sequence(['Mobile user', 'GoFit system'], 8.1, actor=0)
s.message(0, 1, 1.2, 'Select workout')
s.message(1, 0, 1.7, 'Display exercises and configured sets / repetitions', True)
s.message(0, 1, 2.3, 'Start workout')
s.message(1, 0, 2.8, 'Session started', True)
s.frame(3.15, 4.85, 'loop [for performed sets]')
s.message(0, 1, 3.8, 'Enter weight; mark set complete')
s.message(1, 0, 4.45, 'Update progress and display rest countdown', True)
s.message(0, 1, 5.35, 'Finish workout')
s.message(1, 0, 5.85, 'Request workout feedback', True)
s.message(0, 1, 6.4, 'Submit feedback (optional difficulty / notes)')
s.message(1, 0, 7.15, 'Display summary: duration, completed sets, calculated volume', True)
s.save('seq_workout_ssd')

s = Sequence(['Workout session\nscreen', 'workoutService', 'Supabase\nData API'], 10.3)
s.message(0, 1, 1.3, 'createWorkoutSession(userId, session)')
s.message(1, 2, 1.95, 'INSERT workout_sessions\n(user_id, optional workout_id, exercises_completed = [])')
s.message(2, 1, 2.55, 'Created session', True)
s.message(1, 0, 3.05, 'Session ID and data', True)
s.frame(3.5, 5.55, 'loop [for performed sets]')
s.local(0, 4.05, 'Update local weight / completion state')
s.local(0, 4.85, 'startRestTimer(seconds)\nDisplay timer; give completion haptic feedback')
s.local(0, 6.0, 'Finish action opens feedback dialog;\nsubmission builds duration, notes and exercise snapshots')
s.message(0, 1, 7.0, 'updateWorkoutSession(sessionId, userId, updates)')
s.message(1, 2, 7.7, 'UPDATE workout_sessions WHERE id AND user_id\n(completed_at, duration_minutes, exercises_completed, notes)')
s.message(2, 1, 8.35, 'Updated session', True)
s.message(1, 0, 8.9, 'Completion confirmed', True)
s.local(0, 9.45, 'Clear incomplete-session reference;\nnavigate to workout summary')
s.save('seq_workout_detailed')

s = Sequence(['Mobile app\n(screen / listener)', 'offlineQueue\nService', 'AsyncStorage', 'workoutService', 'Supabase\nData API'], 11.5)
s.local(0, 1.25, 'Screen: completion update failed;\nNetInfo reports disconnected')
s.message(0, 1, 2.15, 'Screen: enqueue(sessionId, userId, updates)')
s.message(1, 2, 2.8, 'Read queue; persist appended payload')
s.message(2, 1, 3.35, 'Local write succeeded', True)
s.message(1, 0, 3.9, 'Enqueue completed', True)
s.local(0, 4.45, 'Screen: show saved-offline message\nand open summary')
s.frame(5.3, 11.15, 'opt [application listener later observes connectivity]')
s.message(0, 1, 5.95, 'App listener: syncAll()')
s.message(1, 2, 6.5, 'Read queued updates')
s.message(2, 1, 7.05, 'Queue entries', True)
s.frame(7.25, 10.35, 'loop [for each queued entry; successful update shown]', left=2.65)
s.message(1, 3, 7.65, 'For each entry: updateWorkoutSession(...)')
s.message(3, 4, 8.3, 'UPDATE session\nby id and user_id')
s.message(4, 3, 8.85, 'Updated session', True)
s.message(3, 1, 9.4, 'Update succeeded', True)
s.message(1, 2, 10.0, 'Remove successfully synchronized entry')
s.message(1, 0, 10.65, 'Number of synchronized entries', True)
s.save('seq_workout_offline')
