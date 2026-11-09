const jwt = require('jsonwebtoken');
const { isDemoUser } = require('./demo-account');

function appSession(user) {
  const isDemo = isDemoUser(user);
  const legacy = user.googleId === 'legacy-admin';
  return {
    token: jwt.sign({ userId: user.id, email: user.email, name: user.name }, process.env.JWT_SECRET,
      { expiresIn: isDemo ? '1d' : legacy ? '365d' : '7d' }),
    user: { id: user.id, email: user.email, name: user.name, avatar: user.avatar, isDemo },
  };
}

module.exports = appSession;
