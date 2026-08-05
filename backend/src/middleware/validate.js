const validate = (validationFn) => {
  return (req, res, next) => {
    const errors = validationFn(req);
    if (errors && errors.length > 0) {
      return res.status(400).json({ errors });
    }
    next();
  };
};

module.exports = validate;
