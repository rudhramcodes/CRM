export const completedNonCashPayments = {
  status: 'completed',
  paymentMethod: { $ne: 'cash' },
};

// Reporting only: invoice settlement still includes every completed payment.
export const invoiceCollectionStages = () => [
  {
    $lookup: {
      from: 'payments',
      localField: '_id',
      foreignField: 'invoice',
      pipeline: [
        { $match: { status: 'completed', paymentMethod: 'cash' } },
        { $group: { _id: null, amount: { $sum: '$amount' } } },
      ],
      as: 'cashCollections',
    },
  },
  {
    $set: {
      nonCashCollected: {
        $round: [{
          $max: [0, {
            $subtract: [
              { $ifNull: ['$paidAmount', 0] },
              { $ifNull: [{ $arrayElemAt: ['$cashCollections.amount', 0] }, 0] },
            ],
          }],
        }, 2],
      },
    },
  },
  { $unset: 'cashCollections' },
];
