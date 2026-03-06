  export const Roles = {    //user.user_type
    SUPERADMIN: 1,
    ADMIN: 2,
    EMPLOYEE: 3,
  };
  
  export const Status = {
    ACTIVE: 1,
    INACTIVE: 0,
  };

  export const boolStatus = {
    ACTIVE: true,
    INACTIVE: false,
  };

  export enum SupportedLanguages {
    EN = 'en'
  }

  export const defLang = 'EN';
  
  export const SUPPORTED_LANGUAGES = Object.values(SupportedLanguages);

  export const errorCodes = {
    resOk: 200,
    resCreated: 201,
    resAsyncOp: 202,
    resNoContent: 204,
    resBadResponse: 400,
    resUnauth: 401,
    resForbid: 403,
    resNotFound: 404,
    resNoMethod: 405,
    resConflict: 409,
    resGone: 410,
    resTooMany: 429,
    resIntError: 500,
    resServUnavila: 503
  };

export const DUMMY_PASSWORD_HASH =
  "$2b$10$XwGdFQe6NsWyS/SfNyH9yOe7/SC.Jm9Mw9QzYt/nfLktAXUX3vp7a"; // Hash of 'DummyPassword123!'

export const awsFolders = {
  snapshots: "snapshots/",
  profile: "profile/"
}

export const EXCLUDED_ATTRIBUTES:string[] = ['createdAt', 'updatedAt', 'deletedAt'];

export const hashRoundsPass = 10;

export const IDEMPOTENCY_TTL_SECONDS = 60 * 60 * 24; // 24 hours