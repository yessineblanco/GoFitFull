"""Render the approved body-measurement sequences."""
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


s = Sequence(['Mobile user', 'GoFit application'], 8.6, actor=0)
s.message(0, 1, 1.3, 'Open Body Measurement')
s.message(1, 0, 1.9, 'Display introduction; use height from profile', True)
s.message(0, 1, 2.55, 'Start scan (camera permission granted)')
s.message(1, 0, 3.1, 'Display front-photo camera and guidance', True)
s.message(0, 1, 3.75, 'Capture front photo')
s.message(1, 0, 4.3, 'Front capture accepted: display side-photo camera', True)
s.message(0, 1, 4.95, 'Capture side photo')
s.message(1, 0, 5.65, 'Side capture accepted; analyze locally and display editable drafts\n(chest, waist, hips, shoulder; capture-quality indicators)', True)
s.message(0, 1, 6.65, 'Review / correct values; select Save to progress')
s.message(1, 0, 7.45, 'Save succeeds: refresh measurement history and return to introduction', True)
s.save('seq_measurement_ssd')

s = Sequence(['Measurement\nscreen', 'Expo Camera', 'Measurement\nservice', 'Segmentation\nservice', 'Android native\nMediaPipe bridge'], 13.2)
s.frame(1.0, 4.5, 'loop [front capture, then side capture; accepted captures shown]')
s.message(0, 1, 1.65, 'takePictureAsync(...)')
s.message(1, 0, 2.2, 'Local image URI', True)
s.message(0, 2, 2.85, 'validateMeasurementCapture(image URI, phase, profile height)')
s.message(2, 4, 3.5, 'analyzePoseFromImage(uri)\nfor required images')
s.message(4, 2, 3.85, 'Pose results', True)
s.message(2, 0, 4.25, 'Capture validation result', True)
s.message(0, 2, 5.1, 'analyzeMeasurements(front URI, side URI, height, sex preset)')
s.message(2, 4, 5.8, 'analyzePoseFromImage(uri)\nfor front and side images')
s.message(4, 2, 6.4, 'Pose results', True)
s.local(2, 7.0, 'Compute base estimates\nusing height and statistical priors')
s.message(2, 0, 7.75, 'Base result, quality issues and debug features', True)
s.message(0, 3, 8.45, 'analyzeBodySegmentation(front URI, side URI, pose results)')
s.message(3, 4, 9.15, 'analyzeSegmentationFromImage(uri)\nfor each image')
s.message(4, 3, 9.8, 'Segmentation masks / image data', True)
s.message(3, 0, 10.45, 'Decoded silhouette features', True)
s.local(0, 11.05, 'Apply eligible segmentation refinement or rescue;\notherwise retain base result')
s.local(0, 12.0, 'Set editable values; show results and quality warnings')
s.save('seq_measurement_detailed')

s = Sequence(['Mobile user', 'Measurement screen', 'Supabase Auth\n+ Data API'], 10.9, actor=0)
s.message(1, 0, 1.35, 'Display editable draft and quality warnings', True)
s.message(0, 1, 2.05, 'Review / correct values; select Save to progress')
s.local(1, 2.75, 'Check result error, confidence and blocking warnings;\nparse edited values and check ranges')
s.frame(3.55, 10.3, 'opt [save checks pass; signed-in path shown]')
s.message(1, 2, 4.2, 'auth.getUser()\nthrough configured client')
s.message(2, 1, 4.9, 'Authenticated user', True)
s.message(1, 2, 5.7, 'INSERT body_measurements\n(corrected values, height, confidence, source, manual_overrides)')
s.message(2, 1, 6.45, 'Insert succeeds', True)
s.message(1, 2, 7.15, 'Reload measurement history')
s.message(2, 1, 7.8, 'History query result', True)
s.local(1, 8.45, 'Update history or its error state;\nclear current capture/result state')
s.message(1, 0, 9.4, 'Return to introduction with refreshed history\n(or history-load error)', True)
s.save('seq_measurement_save')


