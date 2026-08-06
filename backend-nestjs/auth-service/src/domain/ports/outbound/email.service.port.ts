export const EMAIL_SERVICE_PORT = Symbol('EMAIL_SERVICE_PORT');

export interface EmailServicePort {
  sendVerificationEmail(to: string, token: string): Promise<void>;
}
