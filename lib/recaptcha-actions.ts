export const RECAPTCHA_ACTIONS = {
  emailSend: "email_send",
  emailVerify: "email_verify",
  phoneSend: "phone_send",
  phoneVerify: "phone_verify",
} as const;

export type ReCaptchaAction =
  (typeof RECAPTCHA_ACTIONS)[keyof typeof RECAPTCHA_ACTIONS];
