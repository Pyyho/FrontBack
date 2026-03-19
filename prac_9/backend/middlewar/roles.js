const roleMiddleware = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Не авторизован' });
        }

        const userRole = req.user.role;
        
        if (!allowedRoles.includes(userRole)) {
            return res.status(403).json({ 
                error: 'Доступ запрещен. Недостаточно прав.'
            });
        }

        next();
    };
};

module.exports = roleMiddleware;