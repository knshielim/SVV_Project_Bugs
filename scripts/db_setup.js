const path = require('path');

const projectRoot = path.join(__dirname, '..'); 

require('dotenv').config({ path: path.join(projectRoot, '.env') });

const mysql = require('mysql2'); 
const fs = require('fs');

const config = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    multipleStatements: true 
};

const DB_NAME = process.env.DB_NAME;
const SQL_SCHEMA_PATH = path.join(projectRoot, 'database.sql');
const PENDING_REG_SQL_PATH = path.join(projectRoot, 'pending_registrations_table.sql');

async function setupDatabase() { 
    if (!config.host || !config.user || !config.password || !DB_NAME) {
        console.error('\n❌ Configuration Error: One or more database environment variables are missing.');
        console.log('   Please ensure DB_HOST, DB_USER, DB_PASS, and DB_NAME are set correctly in your .env file.');
        console.log(`   Found: Host='${config.host}', User='${config.user}', Pass='${config.password ? '***' : ''}', DB='${DB_NAME}'`);
        return; 
    }

    console.log(`Attempting to connect to MySQL host: ${config.host} with user: ${config.user}...`);

    const setupConnection = mysql.createConnection(config);

    try {
        await new Promise((resolve, reject) => {
            setupConnection.connect(err => {
                if (err) return reject(new Error(`MySQL Connection Failed: ${err.message}`));
                console.log('Successfully connected to MySQL server.');
                resolve();
            });
        });

        console.log(`Ensuring database '${DB_NAME}' exists...`);
        await setupConnection.promise().query(`CREATE DATABASE IF NOT EXISTS ${DB_NAME}`);
		
        console.log(`Database '${DB_NAME}' is ready.`);

		await setupConnection.promise().query(`USE ${DB_NAME}`);

		console.log(`Reading schema from ${SQL_SCHEMA_PATH}...`);
		const mainSchemaSql = fs.readFileSync(SQL_SCHEMA_PATH, 'utf8');
		
		const cleanedSql = mainSchemaSql
		    .replace(/CREATE\s+DATABASE\s+[^;]+;/gi, '')
		    .replace(/USE\s+[^;]+;/gi, '')
		    .trim();

		if (!cleanedSql) {
		    console.log('Warning: No SQL statements found in schema file after cleaning.');
		    return;
		}

		console.log(`Executing schema (${cleanedSql.length} characters)...`);
		
		await setupConnection.promise().query(cleanedSql);
		console.log('Main table (users) created/updated successfully.');

        if (fs.existsSync(PENDING_REG_SQL_PATH)) {
            const pendingRegSql = fs.readFileSync(PENDING_REG_SQL_PATH, 'utf8');
            console.log(`Executing schema from ${PENDING_REG_SQL_PATH}...`);
            await setupConnection.promise().query(pendingRegSql);
            console.log('Pending registrations table created/updated successfully.');
        } else {
            console.log('Note: pending_registrations_table.sql not found, skipping...');
        }

        console.log('\n✅ Database setup complete! You can now start the server with: npm start');

    } catch (error) {
        console.error(`\n❌ Database Setup Error: ${error.message}`);
        console.log('\n[Hint] Check if MySQL is running and your .env credentials (DB_USER, DB_PASS) are correct.');
        
        if (error.message.includes("Access denied")) {
            console.log("   [Action Needed] Ensure your MySQL server is running and the user/password combination in your .env file is valid for your local MySQL installation.");
        }

    } finally {
        setupConnection.end();
    }
}

if (!fs.existsSync(SQL_SCHEMA_PATH)) {
    console.error(`Error: SQL schema file not found at ${SQL_SCHEMA_PATH}`);
} else {
    setupDatabase();
}