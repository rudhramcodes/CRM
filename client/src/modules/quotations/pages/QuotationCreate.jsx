import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import QuotationForm from '../components/QuotationForm';
import { useCreateQuotationMutation } from '../../../services/quotationApi';
import { useGetClientsQuery } from '../../../services/clientApi';

export default function QuotationCreate() {
  const navigate = useNavigate();
  const [createQuotation, { isLoading }] = useCreateQuotationMutation();
  const { data: clientsData, isLoading: clientsLoading } = useGetClientsQuery({ limit: 100 });
  const clients = clientsData?.data || [];

  const handleSubmit = async (data) => {
    try {
      const result = await createQuotation(data).unwrap();
      toast.success('Quotation draft created. Review the pages before sending.');
      navigate(`/quotations/${result.data.quotation._id}`);
    } catch (err) {
      const errors = err?.data?.errors;
      if (errors && Array.isArray(errors)) {
        toast.error(errors.map((e) => e.message).join('. '));
      } else {
        toast.error(err?.data?.message || 'Failed to create quotation');
      }
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <button
        type="button"
        onClick={() => navigate('/quotations')}
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Quotations
      </button>

      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Create Quotation</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Choose a client, review the suggested template, then edit each document section. Nothing is sent until you approve the draft.</p>
      </div>

      <div className="bg-white rounded-lg border border-zinc-200 p-4 sm:p-6">
        <QuotationForm
          clients={clients}
          clientsLoading={clientsLoading}
          onSubmit={handleSubmit}
          isSubmitting={isLoading}
          onCancel={() => navigate('/quotations')}
        />
      </div>
    </div>
  );
}
