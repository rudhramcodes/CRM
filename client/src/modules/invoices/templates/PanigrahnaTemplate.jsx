import { getVentureConfig } from './ventureConfig';

const formatCurrency = (val) => `₹${(val || 0).toFixed(2)}`;
const formatDate = (date) =>
  date
    ? new Date(date).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : '-';

function numberToIndianWords(num) {
  if (!num || num === 0) return 'Zero Only';

  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convertBelow1000 = (n) => {
    if (n === 0) return '';
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convertBelow1000(n % 100) : '');
  };

  const amount = Math.round(num);
  const crore = Math.floor(amount / 10000000);
  const lakh = Math.floor((amount % 10000000) / 100000);
  const thousand = Math.floor((amount % 100000) / 1000);
  const hundred = amount % 1000;

  let words = [];
  if (crore) words.push(convertBelow1000(crore) + ' Crore');
  if (lakh) words.push(convertBelow1000(lakh) + ' Lakh');
  if (thousand) words.push(convertBelow1000(thousand) + ' Thousand');
  if (hundred) words.push(convertBelow1000(hundred));

  return words.join(' ') + ' Only';
}

export default function PanigrahnaTemplate({ invoice }) {
  const client = invoice?.client || {};
  const venture = getVentureConfig(client.brand || 'panigrahna');
  const bank = venture.bankDetails;
  const addr = venture.addresses;

  return (
    <div className="bg-white" style={{ fontFamily: "'Inter', 'Arial', sans-serif", color: '#2C1810' }}>
      <div className="flex justify-between items-start mb-8 pb-6" style={{ borderBottom: '2px solid #B3752F' }}>
        <div className="flex items-center gap-4">
          {venture.logoUrl ? (
            <img src={venture.logoUrl} alt={venture.label} className="h-16 w-auto object-contain" />
          ) : (
            <div className="h-16 w-16 rounded flex items-center justify-center text-xs" style={{ backgroundColor: '#B3752F', color: '#fff' }}>
              PG
            </div>
          )}
        </div>
        <div className="text-right">
          <h2 className="text-3xl font-bold tracking-wide" style={{ color: '#B3752F' }}>INVOICE</h2>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8 mb-8">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#B3752F' }}>Bill To</h3>
          <p className="text-base font-semibold" style={{ color: '#2C1810' }}>{client.companyName || '-'}</p>
          <p className="text-sm" style={{ color: '#4A3F35' }}>{client.contactPerson || ''}</p>
          <p className="text-sm" style={{ color: '#4A3F35' }}>{client.email || ''}</p>
          {client.gstNumber && <p className="text-sm" style={{ color: '#4A3F35' }}>GST: {client.gstNumber}</p>}
          <p className="text-xs mt-1" style={{ color: '#8B7355' }}>Client ID: {client.clientId || '-'}</p>
        </div>
        <div className="text-right space-y-1">
          <p className="text-sm">
            <span style={{ color: '#B3752F' }}>Invoice No : </span>
            <span className="font-semibold" style={{ color: '#2C1810' }}>{invoice.invoiceNumber}</span>
          </p>
          <p className="text-sm">
            <span style={{ color: '#B3752F' }}>Date : </span>
            <span style={{ color: '#2C1810' }}>{formatDate(invoice.issueDate)}</span>
          </p>
          <p className="text-sm">
            <span style={{ color: '#B3752F' }}>Due Date : </span>
            <span style={{ color: '#2C1810' }}>{formatDate(invoice.dueDate)}</span>
          </p>
        </div>
      </div>

      <table className="w-full mb-8 border-collapse">
        <thead>
          <tr className="bg-[#B3752F] text-white">
            <th className="py-3 px-3 text-left text-xs font-medium uppercase tracking-wider w-12">Sr. No.</th>
            <th className="py-3 px-3 text-left text-xs font-medium uppercase tracking-wider">Services</th>
            <th className="py-3 px-3 text-right text-xs font-medium uppercase tracking-wider w-20">Quantity</th>
            <th className="py-3 px-3 text-right text-xs font-medium uppercase tracking-wider w-28">Rate</th>
            <th className="py-3 px-3 text-right text-xs font-medium uppercase tracking-wider w-28">Amount</th>
          </tr>
        </thead>
        <tbody>
          {(invoice.items || []).map((item, index) => (
            <tr key={index} className="border-b" style={{ borderColor: '#E8DDD0' }}>
              <td className="py-3 px-3 text-sm" style={{ color: '#8B7355' }}>{index + 1}</td>
              <td className="py-3 px-3 text-sm" style={{ color: '#2C1810' }}>{item.description}</td>
              <td className="py-3 px-3 text-sm text-right" style={{ color: '#2C1810' }}>{item.quantity}</td>
              <td className="py-3 px-3 text-sm text-right" style={{ color: '#2C1810' }}>{formatCurrency(item.unitPrice)}</td>
              <td className="py-3 px-3 text-sm text-right font-medium" style={{ color: '#2C1810' }}>{formatCurrency(item.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-end mb-8">
        <div className="w-72 space-y-2">
          <div className="flex justify-between text-sm">
            <span style={{ color: '#8B7355' }}>Subtotal</span>
            <span style={{ color: '#2C1810' }}>{formatCurrency(invoice.subtotal)}</span>
          </div>
          {invoice.taxRate > 0 && (
            <div className="flex justify-between text-sm">
              <span style={{ color: '#8B7355' }}>GST ({invoice.taxRate}%)</span>
              <span style={{ color: '#2C1810' }}>{formatCurrency(invoice.taxAmount)}</span>
            </div>
          )}
          {invoice.discountPercent > 0 && (
            <div className="flex justify-between text-sm">
              <span style={{ color: '#8B7355' }}>Discount ({invoice.discountPercent}%)</span>
              <span className="font-medium" style={{ color: '#B3752F' }}>-{formatCurrency(invoice.discountAmount)}</span>
            </div>
          )}
          <hr style={{ borderColor: '#B3752F' }} />
          <div className="flex justify-between text-lg font-bold" style={{ color: '#B3752F' }}>
            <span>Total</span>
            <span>{formatCurrency(invoice.total)}</span>
          </div>
          <p className="text-xs italic text-right pt-1" style={{ color: '#8B7355' }}>
            {numberToIndianWords(invoice.total)}
          </p>
          {invoice.paidAmount > 0 && (
            <>
              <div className="flex justify-between text-sm" style={{ color: '#588157' }}>
                <span>Paid</span>
                <span>-{formatCurrency(invoice.paidAmount)}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold" style={{ color: '#B3752F' }}>
                <span>Balance Due</span>
                <span>{formatCurrency(invoice.balanceDue)}</span>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="border-t-2 pt-6 mb-6" style={{ borderColor: '#B3752F' }}>
        <h3 className="text-sm font-bold mb-2" style={{ color: '#B3752F' }}>Bank Details</h3>
        <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm" style={{ color: '#4A3F35' }}>
          <p><span style={{ color: '#8B7355' }}>Bank Name :</span> {bank.bankName}</p>
          <p><span style={{ color: '#8B7355' }}>Account Holder :</span> {bank.accountHolder}</p>
          <p><span style={{ color: '#8B7355' }}>Account Type :</span> {bank.accountType}</p>
          <p><span style={{ color: '#8B7355' }}>Account Number :</span> {bank.accountNumber}</p>
          <p><span style={{ color: '#8B7355' }}>IFSC Code :</span> {bank.ifscCode}</p>
          <p><span style={{ color: '#8B7355' }}>UPI ID :</span> {bank.upiId}</p>
        </div>
      </div>

      {invoice.notes && (
        <div className="mb-6 text-sm" style={{ color: '#4A3F35' }}>
          <p className="text-xs mb-1" style={{ color: '#B3752F' }}>Notes:</p>
          <p className="whitespace-pre-wrap">{invoice.notes}</p>
        </div>
      )}

      <div className="border-t pt-4 mt-6 text-xs space-y-1" style={{ borderColor: '#B3752F', color: '#8B7355' }}>
        <p><span className="font-semibold" style={{ color: '#B3752F' }}>Head Office :</span> <span style={{ color: '#8B7355' }}>{addr.headOffice}</span></p>
        <p><span className="font-semibold" style={{ color: '#B3752F' }}>Operations Office :</span> <span style={{ color: '#8B7355' }}>{addr.operationsOffice}</span></p>
      </div>
    </div>
  );
}
