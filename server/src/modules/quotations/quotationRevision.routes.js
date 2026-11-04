import { Router } from 'express';
import ApiResponse from '../../utils/ApiResponse.js';
import { serializeQuotation, serializeRevision } from '../../services/quotationSnapshot.js';
import * as revisions from './quotationRevision.service.js';
import { migrateQuotation } from './quotationRevision.migration.js';
import { sendRevision, setRevisionStatus } from './quotationRevision.delivery.js';

const router = Router();
const mutation = (operation) => async (req, res, next) => {
  try {
    const family = await operation(req);
    ApiResponse.success(res, 200, { quotation: serializeQuotation(family) });
  } catch (error) { next(error); }
};
const artifact = (working, type) => async (req, res, next) => {
  try {
    const bytes = working ? await revisions.getWorkingArtifact(req.params.id, type) :
      await revisions.getRevisionArtifact(req.params.id, req.params.version, type);
    res.setHeader('Cache-Control', 'private, no-store');
    if (type === 'html') {
      res.setHeader('Content-Security-Policy', "default-src 'none'; img-src data:; font-src data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'");
      res.type('html').send(bytes);
    } else {
      const family = await revisions.getFamily(req.params.id);
      res.type('pdf').setHeader('Content-Disposition', `attachment; filename="${family.quotationNumber}-V${working ? family.latestVersion + 1 : Number(req.params.version)}.pdf"`);
      res.send(bytes);
    }
  } catch (error) { next(error); }
};

router.post('/:id/revisions/baseline', mutation((req) => migrateQuotation(req.params.id, req.user)));
router.post('/:id/working-copy', mutation((req) => revisions.createWorkingCopy(req.params.id, req.body, req.user)));
router.patch('/:id/working-copy', mutation((req) => revisions.editWorkingCopy(req.params.id, req.body, req.user)));
router.post('/:id/working-copy/discard', mutation((req) => revisions.discardWorkingCopy(req.params.id, req.body)));
router.get('/:id/working-copy/html', artifact(true, 'html'));
router.get('/:id/working-copy/pdf', artifact(true, 'pdf'));
router.patch('/:id/archive', mutation((req) => revisions.archiveQuotation(req.params.id, req.body, req.user)));
router.post('/:id/revisions', async (req, res, next) => {
  try {
    const result = await revisions.saveRevision(req.params.id, req.body, req.user);
    ApiResponse.created(res, { quotation: serializeQuotation(result.quotation), revision: serializeRevision(result.revision) }, 'Revision saved');
  } catch (error) { next(error); }
});
router.get('/:id/revisions/:version', async (req, res, next) => {
  try {
    const revision = await revisions.getRevision(req.params.id, req.params.version);
    ApiResponse.success(res, 200, { revision: serializeRevision(revision) });
  } catch (error) { next(error); }
});
router.get('/:id/revisions/:version/html', artifact(false, 'html'));
router.get('/:id/revisions/:version/pdf', artifact(false, 'pdf'));
router.post('/:id/revisions/:version/send', mutation((req) => sendRevision(req.params.id, req.params.version, req.user)));
router.post('/:id/revisions/:version/resend', mutation((req) => sendRevision(req.params.id, req.params.version, req.user, true)));
router.patch('/:id/revisions/:version/status', mutation((req) => setRevisionStatus(req.params.id, req.params.version, req.body, req.user)));

export default router;
