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
        { $match: { status: 'completed' } },
        { $group: { _id: null,
          cash: { $sum: { $cond: [{ $eq: ['$paymentMethod', 'cash'] }, '$amount', 0] } },
          nonCash: { $sum: { $cond: [{ $ne: ['$paymentMethod', 'cash'] }, '$amount', 0] } },
        } },
      ],
      as: 'cashCollections',
    },
  },
  {
    $set: {
      nonCashCollected: { $round: [{ $ifNull: [{ $arrayElemAt: ['$cashCollections.nonCash', 0] }, 0] }, 2] },
      cashCollected: { $round: [{ $ifNull: [{ $arrayElemAt: ['$cashCollections.cash', 0] }, 0] }, 2] },
    },
  },
  { $unset: 'cashCollections' },
];
