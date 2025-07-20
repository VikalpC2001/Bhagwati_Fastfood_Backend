const mysql = require('mysql');

const pool2 = mysql.createPool({
    connectionLimit: process.env.SQL_CONNECTIONLIMIT || 10,
    host: process.env.SQL_HOST,
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    database: process.env.SQL_DATABASE,
    multipleStatements: true
});

// Optional: test connection once at startup
pool2.getConnection((err, connection) => {
    if (err) {
        console.error('MySQL Pool Connection Error:', err);
    } else {
        console.log('MySQL Pool Connected Successfully');
        connection.release(); // always release the connection back to the pool
    }
});

module.exports = pool2;
