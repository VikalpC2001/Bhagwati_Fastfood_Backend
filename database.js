const mysql = require('mysql');

const pool = mysql.createConnection({
    host: process.env.SQL_HOST,
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    database: process.env.SQL_DATABASE,
    multipleStatements: true
});

pool.connect(err => {
    if (err) {
        console.error('MySQL connection error:', err);
    } else {
        console.log('MySQL connected.');
    }
});

module.exports = pool;
