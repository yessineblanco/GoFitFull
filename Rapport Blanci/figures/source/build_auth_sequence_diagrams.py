"""Render the source-checked authentication and onboarding sequences."""
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


s = Sequence(['Mobile user', 'GoFit application'], 10.5, actor=0)
s.message(0, 1, 1.3, 'Submit registration or sign-in credentials')
s.message(1, 0, 1.9, 'Session available: display onboarding introduction', True)
s.message(0, 1, 2.55, 'Select Get Started')
s.message(1, 0, 3.1, 'Display Weight screen', True)
s.message(0, 1, 3.65, 'Enter weight / unit; continue')
s.message(1, 0, 4.2, 'Display Height screen', True)
s.message(0, 1, 4.75, 'Enter height / unit; continue')
s.message(1, 0, 5.3, 'Display Personal details screen', True)
s.message(0, 1, 5.85, 'Enter name, age and gender; continue')
s.message(1, 0, 6.4, 'Display Goal screen', True)
s.message(0, 1, 6.95, 'Select goal; continue')
s.message(1, 0, 7.5, 'Display Nutrition preferences screen', True)
s.message(0, 1, 8.2, 'Enter optional preferences, allergies and dislikes; finish')
s.message(1, 0, 9.05, 'Display client Home\n(local onboarding completion enables navigation)', True)
s.save('seq_auth_ssd')

s = Sequence(['Authentication\nscreen', 'Auth store', 'Auth service +\nSupabase client', 'Supabase Auth', 'Storage adapter\n(SecureStore)'], 9.8)
s.message(0, 1, 1.35, 'signUp(...) or signIn(...)')
s.message(1, 2, 2.0, 'authService.signUp(...)\nor authService.signIn(...)')
s.message(2, 3, 2.8, 'auth.signUp(...) or\nauth.signInWithPassword(...)')
s.message(3, 2, 3.6, 'User / session result\n(signup session may be absent)', True)
s.frame(4.05, 5.6, 'opt [authenticated session returned]', left=4.6)
s.message(2, 4, 4.7, 'Client persists session through adapter.setItem(...)')
s.message(4, 2, 5.25, 'Storage operation completes', True)
s.message(2, 1, 6.2, 'Authentication result', True)
s.local(1, 6.85, 'Update user and session state')
s.message(1, 0, 7.65, 'Authentication action completes', True)
s.local(0, 8.3, 'Root routing requires a session;\nclient onboarding shown if local completion flag is absent')
s.save('seq_auth_detailed')

s = Sequence(['Onboarding UI\n+ app routing', 'Onboarding\nstore', 'User profile\nservice', 'Supabase\nData API', 'AsyncStorage'], 13.1)
s.frame(1.0, 2.8, 'loop [weight, height, personal details and goal]')
s.message(0, 1, 1.65, 'setOnboardingData(answers)')
s.message(1, 4, 2.3, 'Merge draft in memory; write temporary answers')
s.message(0, 1, 3.35, 'Finish on Nutrition screen: getOnboardingData()')
s.message(1, 0, 3.9, 'Collected draft', True)
s.message(0, 2, 4.65, 'saveOnboardingData(userId, draft + nutrition answers)')
s.local(2, 5.25, 'Validate; convert weight / height units')
s.message(2, 3, 6.05, 'UPSERT user_profiles\nvia API client')
s.frame(6.4, 8.35, 'alt [remote save outcome]', left=.3)
s.message(3, 2, 6.95, '[success] saved', True)
s.message(2, 0, 7.3, 'Return', True)
s.ax.plot([.3, 9.7], [7.5, 7.5], color=FRAME, lw=.65, linestyle='--')
s.message(2, 0, 8.05, '[failure] service suppresses error or screen catches it', True)
s.message(0, 1, 8.95, 'setHasCompletedOnboarding(userId, true)')
s.local(1, 9.55, 'Set completion flag in memory')
s.message(1, 4, 10.35, 'Attempt to persist completed user IDs\n(storage errors are logged)')
s.message(0, 1, 11.25, 'clearOnboardingData()')
s.message(1, 4, 11.85, 'Clear draft; request temporary-data removal')
s.local(0, 12.35, 'App routing uses local flag to display Home')
s.save('seq_auth_onboarding')


