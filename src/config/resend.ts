import { Resend } from 'resend';

import { RESEND_API_KEY } from './env';

// Cliente Resend. Si `RESEND_API_KEY` no está seteado (ej. en dev), quedamos
// con `null` y los emails se saltean silenciosamente — la creación del reporte
// no se rompe por eso.
export const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;
