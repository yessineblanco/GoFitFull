"""Render the approved checkout, pack purchase and booking sequences."""
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



# Current source projection, 24 October 2026; successful paths are not test results.
s = Sequence(['Mobile client', 'GoFit application'], 10.7, actor=0)
s.message(0, 1, 1.3, 'Open Coach Profile')
s.message(1, 0, 1.85, 'Display coach details, packs and Book Session action', True)
s.frame(2.3, 10.15, 'alt [selected action; successful paths shown]')
s.message(0, 1, 3.0, '[pack] Select pack and purchase')
s.message(1, 0, 3.6, 'Server-priced EUR checkout: display PaymentSheet', True)
s.message(0, 1, 4.2, 'Complete payment interaction')
s.message(1, 0, 4.85, 'Server verifies and saves purchase: display success', True)
s.ax.plot([.3, 9.7], [5.3, 5.3], color=FRAME, lw=.65, linestyle='--')
s.message(0, 1, 5.95, '[standalone] Open Book Session')
s.message(1, 0, 6.5, 'Display Berlin availability, saved duration and EUR price', True)
s.message(0, 1, 7.05, 'Select day / time; confirm session')
s.message(1, 0, 7.65, 'Reserve time; display native PaymentSheet', True)
s.message(0, 1, 8.25, 'Authorize payment')
s.message(1, 0, 9.1, 'Capture and confirmation succeed: refresh bookings; display success', True)
s.save('seq_booking_ssd')

s = Sequence(['Mobile checkout\nscreen', 'stripe-payment\nEdge Function', 'Supabase Auth\n+ database APIs', 'Stripe API', 'Native Stripe\nPaymentSheet SDK'], 12.1)
s.message(0, 1, 1.35, 'create_pack(packId) OR\ncreate_session(booking terms)')
s.message(1, 2, 2.05, 'getUser(token); resolve trusted EUR terms')
s.message(2, 1, 2.75, 'Active pack OR validated pending session reservation', True)
s.message(1, 3, 3.45, 'Create EUR PaymentIntent\n(session: manual capture; pack: default capture)')
s.message(3, 1, 4.25, 'Client secret and payment reference', True)
s.message(1, 0, 4.95, 'Checkout details (session also returns booking / expiry)', True)
s.message(0, 4, 5.7, 'initPaymentSheet(client secret)')
s.message(4, 0, 6.4, 'Initialization succeeds', True)
s.message(0, 4, 7.1, 'presentPaymentSheet(): client interacts with native UI')
s.message(4, 0, 7.85, 'Result without error', True)
s.message(0, 1, 8.6, 'Request server fulfilment with PaymentIntent reference')
s.frame(9.2, 10.0, 'ref  Pack verification OR standalone capture / confirmation sequence')
s.message(1, 0, 10.7, 'Verified persisted result (successful path)', True)
s.save('seq_booking_detailed')

s = Sequence(['Coach Detail\nscreen + pack service', 'stripe-payment\nEdge Function', 'Stripe API', 'Database API\npurchased_packs'], 10.8)
s.frame(1.0, 1.75, 'ref  Pack PaymentSheet returns without error')
s.message(0, 1, 2.35, 'fulfill_pack(paymentIntentId)')
s.message(1, 2, 3.1, 'Retrieve PaymentIntent')
s.message(2, 1, 3.85, 'Provider state, metadata, amount and mode', True)
s.local(1, 4.5, 'Verify authenticated owner, pack kind,\nEUR, succeeded and received amount')
s.message(1, 3, 5.45, 'INSERT purchase, credits, unique payment reference and paid snapshot')
s.message(3, 1, 6.25, 'Created purchase (or unique-reference conflict)', True)
s.frame(6.75, 8.4, 'opt [reference already exists]')
s.message(1, 3, 7.35, 'Read existing purchase; check same owner')
s.message(3, 1, 8.0, 'Existing purchase; no duplicate credits', True)
s.message(1, 0, 9.0, 'Return purchaseId and verified provider status', True)
s.local(0, 9.65, 'Display purchase success')
s.save('seq_booking_pack_recording')

s = Sequence(['Book Session\nscreen + service', 'stripe-payment\nEdge Function', 'Database\nRPCs', 'Stripe API'], 13.1)
s.frame(1.0, 1.8, 'ref  create_session reserved slot; PaymentSheet authorized card')
s.message(0, 1, 2.4, 'fulfill_session(paymentIntentId)')
s.message(1, 3, 3.15, 'Retrieve intent; verify owner, session kind, EUR and amount')
s.message(3, 1, 3.9, 'Authorized or already-succeeded intent', True)
s.message(1, 2, 4.65, 'prepare_paid_session_capture(booking, client, payment)')
s.message(2, 1, 5.4, 'Valid reservation protected during capture (or already paid)', True)
s.frame(5.95, 10.75, 'opt [booking is not already paid]')
s.message(1, 3, 6.65, 'If requires_capture: capture with per-intent idempotency key')
s.message(3, 1, 7.45, 'Succeeded; received amount matches', True)
s.message(1, 2, 8.3, 'complete_paid_session(payment, amount, mode)')
s.message(2, 1, 9.15, 'Booking confirmed and payment_status = paid', True)
s.message(1, 0, 11.35, 'Return saved booking and succeeded status', True)
s.local(0, 12.0, 'Refresh client bookings; show success; navigate back')
s.save('seq_booking_direct')
