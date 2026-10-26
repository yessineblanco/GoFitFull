"""Render the approved administrator coach-approval sequences."""
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
        label_x = x - .12 if a == len(self.x) - 1 else x + .4
        align = 'right' if a == len(self.x) - 1 else 'left'
        self.ax.text(label_x, y + .1, label, fontsize=8.5, va='center', ha=align,
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


s = Sequence(['Administrator', 'GoFit admin portal'], 9.4, actor=0)
s.message(0, 1, 1.3, 'Open Coach Management (/coaches)')
s.message(1, 0, 1.95, 'Display coach table (All status filter)', True)
s.message(0, 1, 2.6, 'Select Pending filter')
s.message(1, 0, 3.2, 'Display pending coach rows and available actions', True)
s.frame(3.65, 5.2, 'opt [CV link exists and administrator opens it]')
s.message(0, 1, 4.25, 'Select View CV')
s.message(1, 0, 4.85, 'Open existing CV URL in a new tab', True)
s.message(0, 1, 5.85, 'Select Approve for a pending coach')
s.message(1, 0, 6.5, 'Display approval confirmation dialog', True)
s.message(0, 1, 7.15, 'Confirm approval')
s.message(1, 0, 8.0, 'Update succeeds: display success and refresh coach table\n(status = approved; verification flag enabled)', True)
s.save('seq_admin_audit_ssd')

s = Sequence(['CoachActions\n(browser)', 'PATCH /api/coaches\n(server)', 'Admin-access\nhelpers (server)', 'Supabase Auth\n+ Data API', 'Database\ntrigger'], 13.8)
s.message(0, 1, 1.35, 'PATCH { coachProfileId, status: approved }')
s.message(1, 2, 2.05, 'verifyAdminAccess()')
s.message(2, 3, 2.75, 'Resolve current authenticated user')
s.message(3, 2, 3.4, 'User', True)
s.message(2, 3, 4.05, 'Read user_profiles.is_admin\nusing server admin client')
s.message(3, 2, 4.75, 'is_admin = true', True)
s.message(2, 1, 5.4, 'Access check passes', True)
s.local(1, 6.05, 'Validate required fields and allowed status')
s.message(1, 3, 6.9, 'Admin client: UPDATE coach_profiles\n(status, is_verified, updated_at) WHERE id = coachProfileId')
s.frame(7.35, 9.65, 'opt [transition from non-approved to approved]', left=6.0)
s.message(3, 4, 8.0, 'After profile update:\nauto_create_coach_wallet()')
s.local(4, 8.7, 'Ensure EUR wallet\nexists for coach')
s.message(4, 3, 9.3, 'Trigger completes', True)
s.message(3, 1, 10.25, 'Updated coach record', True)
s.message(1, 0, 10.95, 'JSON { success: true, coach }', True)
s.local(0, 11.65, 'Show success toast; router.refresh()')
s.frame(12.5, 13.25, 'ref  Coach list is fetched and rendered again')
s.save('seq_admin_audit_detailed')


