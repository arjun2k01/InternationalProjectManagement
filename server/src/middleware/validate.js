const { body, param, query, validationResult } = require("express-validator");

const validate = (validations = []) => async (req, res, next) => {
  const validationChains = Array.isArray(validations)
    ? validations.flat()
    : [validations];

  await Promise.all(
    validationChains
      .filter(Boolean)
      .map((validation) => validation.run(req))
  );

  const errors = validationResult(req);

  if (errors.isEmpty()) {
    return next();
  }

  return res.status(400).json({
    success: false,
    error: {
      message: "Validation failed.",
      details: errors.array().map((error) => ({
        field: error.path,
        message: error.msg,
      })),
    },
  });
};

const validateObjectId = (field, location = "param") => {
  const factories = {
    body,
    param,
    query,
  };

  return factories[location](field)
    .isMongoId()
    .withMessage(`${field} must be a valid MongoDB ObjectId.`);
};

module.exports = {
  validate,
  validateObjectId,
};
