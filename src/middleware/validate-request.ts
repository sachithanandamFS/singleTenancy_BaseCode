import { NextFunction, Request, Response } from "express";
import { AnyObjectSchema } from "yup";
import { errorCodes, SupportedLanguages } from "../constants/constants.js";
import { AppError } from "../utils/appError.js";
import { ValidationError } from "yup";

// Define schema type that accepts language parameter
type SchemaFactory = (lang: SupportedLanguages) => AnyObjectSchema;

export const validateRequest =
  (schemaFactory: SchemaFactory) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const lang: SupportedLanguages = req.lang || SupportedLanguages.EN;

      const schema = schemaFactory(lang);

      await schema.validate(
        {
          body: req.body,
          query: req.query,
          params: req.params,
        },
        { abortEarly: false }
      );

      next();
    } catch (err) {
      if (err instanceof ValidationError) {
        const validationErrors = err.inner.map((error) => ({
          message: error.message,
          path: error.path || "unknown",
        }));

        return next(
          new AppError(
            "validation_failed",
            errorCodes.resBadResponse,
            validationErrors
          )
        );
      }
      next(err);
    }
  };
