export const EMAIL_ADAPTER_PORT = Symbol('EMAIL_ADAPTER_PORT');

export interface EmailAdapterPort {
  sendEmail(to: string, subject: string, body: string): Promise<boolean>;
}
