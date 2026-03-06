import { number, object, string, array, boolean } from "yup";
import { getTranslation } from "../services/translation.js";
import { SupportedLanguages } from "../constants/constants.js";

type Translator = (key: string) => string;

const createTranslator =
  (lang: SupportedLanguages): Translator =>
  (key) =>
    getTranslation(key, lang);

export const empLoginSchema = (lang: SupportedLanguages) => {
  const t = createTranslator(lang);
  return object({
    body: object({
      email: string().required(t("email_req")).email(t("invalid_email")),
      password: string().required(t("password_req")),
    }),
  });
};

export const updatedEmployeeSchema = (lang: SupportedLanguages) => {
  const t = createTranslator(lang);
  return object({
    body: object({
      email: string().required(t("email_req")).email(t("invalid_email")),
      name: string()
        .required(t("name_req"))
        .min(2, t("name_min"))
        .max(50, t("name_max")),
    }),
  });
};

export const createEmployeeSchema = (lang: SupportedLanguages) => {
  const t = createTranslator(lang);
  return object({
    body: object({
      email: string().required(t("email_req")).email(t("invalid_email")),
      password: string()
        .required(t("password_req"))
        .min(8, t("password_min"))
        .matches(
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/,
          t("password_complexity")
        ),
      name: string()
        .required(t("name_req"))
        .min(2, t("name_min"))
        .max(50, t("name_max")),
    }),
  });
};

export const changePasswordSchema = (lang: SupportedLanguages) => {
  const t = createTranslator(lang);
  return object({
    body: object({
      old_password: string().required(t("old_password_req")),
      new_password: string()
        .required(t("new_password_req"))
        .min(8, t("password_min"))
        .matches(
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/,
          t("password_complexity")
        ),
    }),
  });
};

export const createResponsibilitySchema = (lang: SupportedLanguages) => {
  const t = createTranslator(lang);
  return object({
    body: object({
      m_name: string().required(t("mname_req")),
      m_desc: string().required(t("mdesc_req")),
    }),
  });
};

export const assignUserSchema = (lang: SupportedLanguages) => {
  const t = createTranslator(lang);
  return object({
    body: object({
      r_role_ids: array()
        .required(t("roleid_requried"))
        .of(number().typeError(t("roleid_invalid")).strict())
        .min(1, t("roleid_invalid")),
    }),
  });
};

export const assignRoleSchema = (lang: SupportedLanguages) => {
  const t = createTranslator(lang);
  return object({
    body: object({
      permissions: array()
        .required(t("respid_requried"))
        .of(
          object({
            module_id: number()
              .typeError(t("module_invalid"))
              .required(t("module_required")),
            resp_ids: array()
              .required(t("respid_requried"))
              .of(number().typeError(t("respid_invalid")).strict())
              .min(1, t("respid_invalid")),
          })
        )
        .min(1, t("respid_invalid")),
    }),
  });
};

export const createRoleSchema = (lang: SupportedLanguages) => {
  const t = createTranslator(lang);
  return object({
    body: object({
      r_name: string()
        .required(t("rname_req"))
        .min(2, t("rname_min"))
        .max(100, t("rname_max")),
      r_desc: string()
        .required(t("rdesc_req"))
        .min(1, t("rdesc_min"))
        .max(500, t("rdesc_max")),
    }),
  });
};

export const IdParamSchema = (lang: SupportedLanguages) => {
  const t = createTranslator(lang);
  return object({
    params: object({
      id: number()
        .required(t("id_req"))
        .typeError(t("id_invalid"))
        .integer(t("id_invalid"))
        .min(1, t("id_invalid")),
    }),
  });
};

export const empTokenSchema = (lang: SupportedLanguages) => {
  const t = createTranslator(lang);
  return object({
    body: object({
      token: string().required(t("token_req")),
    }),
  });
};