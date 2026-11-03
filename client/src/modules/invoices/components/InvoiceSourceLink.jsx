import { Link } from 'react-router-dom';
import { useGetQuotationByIdQuery } from '../../../services/quotationApi';

export default function InvoiceSourceLink({ invoice }) {
  const quotationId = invoice.sourceQuotation?._id || invoice.sourceQuotation;
  const version = invoice.sourceRevisionVersion;
  const { data } = useGetQuotationByIdQuery(quotationId, { skip: !quotationId || !version });
  if (!quotationId) return null;
  return (
    <p>
      Created from{' '}
      <Link to={`/quotations/${quotationId}${version ? `?version=${version}` : ''}`} className="font-medium text-amber-800 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-700">
        {version ? `${data?.data?.quotation?.quotationNumber || 'Source quotation'} V${version}` : 'source quotation'}
      </Link>
    </p>
  );
}
