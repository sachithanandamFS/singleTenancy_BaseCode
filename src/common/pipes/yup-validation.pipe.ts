import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { AnyObjectSchema, ValidationError } from 'yup';
import { SupportedLanguages, errorCodes } from '../../constants/constants';
import { AppError } from '../../utils/appError';

type SchemaFactory = (lang: SupportedLanguages) => AnyObjectSchema;

@Injectable()
export class YupValidationPipe implements PipeTransform {
  constructor(
    private readonly schemaFactory: SchemaFactory,
    private readonly lang: SupportedLanguages = SupportedLanguages.EN,
  ) {}

  async transform(value: any, _metadata: ArgumentMetadata): Promise<any> {
    return value;
  }

  static forSchema(schemaFactory: SchemaFactory) {
    return new YupValidationPipe(schemaFactory);
  }
}

export async function validateWithYup(
  schemaFactory: SchemaFactory,
  data: { body?: any; query?: any; params?: any },
  lang: SupportedLanguages,
): Promise<void> {
  try {
    const schema = schemaFactory(lang);
    await schema.validate(data, { abortEarly: false });
  } catch (err) {
    if (err instanceof ValidationError) {
      const validationErrors = err.inner.map(e => ({
        message: e.message,
        path: e.path ?? 'unknown',
      }));
      throw new AppError('validation_failed', errorCodes.resBadResponse, validationErrors);
    }
    throw err;
  }
}
