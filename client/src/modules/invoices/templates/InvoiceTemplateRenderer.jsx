import PanigrahnaTemplate from './PanigrahnaTemplate';

const TEMPLATE_MAP = {
  panigrahna: PanigrahnaTemplate,
  aghori: PanigrahnaTemplate,
  house_of_joggi: PanigrahnaTemplate,
  damrru: PanigrahnaTemplate,
  tandavs: PanigrahnaTemplate,
  kapaalik: PanigrahnaTemplate,
  kalyannam: PanigrahnaTemplate,
  storage_media_solution: PanigrahnaTemplate,
};

export default function InvoiceTemplateRenderer({ invoice, className = '' }) {
  const brand = invoice?.client?.brand || 'panigrahna';
  const Template = TEMPLATE_MAP[brand] || PanigrahnaTemplate;

  return (
    <div className={className}>
      <Template invoice={invoice} />
    </div>
  );
}
