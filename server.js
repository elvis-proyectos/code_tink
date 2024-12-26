const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Simula un usuario administrador con credenciales
const ADMIN_USER = 'administrador';
const ADMIN_PASS = 'Robotito2025';

// Leer la lista de códigos
let codes = JSON.parse(fs.readFileSync('codes.json')).codes;

// Endpoint para manejar solicitudes de códigos
app.post('/api/send-code', (req, res) => {
    const { name, email } = req.body;

    if (!name || !email) {
        return res.status(400).json({ success: false, error: 'Nombre y correo requeridos' });
    }

    if (codes.length === 0) {
        return res.status(400).json({ success: false, error: 'No hay códigos disponibles. Contacte al administrador.' });
    }

    // Asignar un código único
    const code = codes.pop(); // Sacar un código de la lista
    fs.writeFileSync('codes.json', JSON.stringify({ codes })); // Actualizar la lista de códigos

    // Guardar los datos del usuario en un archivo temporal
    fs.appendFileSync('users.txt', `${name}, ${email}, ${code}\n`);

    // Devolver el código al frontend
    res.json({ success: true, code });
});

// Ruta para el inicio de sesión de administrador
app.get('/admin/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/admin-login.html'));
});

// Ruta para autenticar al administrador
app.post('/admin/authenticate', (req, res) => {
    const { username, password } = req.body;

    if (username === ADMIN_USER && password === ADMIN_PASS) {
        // Autenticación exitosa: redirige a la página de registros
        res.redirect('/admin/records');
    } else {
        // Autenticación fallida: muestra un mensaje de error
        res.send(`
            <h1>Inicio de sesión fallido</h1>
            <a href="/admin/login">Volver al inicio de sesión</a>
        `);
    }
});

// Ruta para mostrar los registros (protegida), códigos disponibles y añadir códigos
app.get('/admin/records', (req, res) => {
    // Leer los registros desde el archivo
    const users = fs.readFileSync('users.txt', 'utf-8');
    const records = users.split('\n').filter(line => line.trim() !== '').map(line => {
        const [name, email, code] = line.split(', ');
        return { name, email, code };
    });

    // Renderizar los registros en HTML
    let html = `
        <h1>Registros de Usuarios</h1>
        <table border="1">
            <tr>
                <th>Nombre</th>
                <th>Correo Electrónico</th>
                <th>Código</th>
            </tr>
    `;
    records.forEach(record => {
        html += `
            <tr>
                <td>${record.name}</td>
                <td>${record.email}</td>
                <td>${record.code}</td>
            </tr>
        `;
    });
    html += `</table><br>`;

    // Mostrar los códigos disponibles con opciones para editar/eliminar
    html += `
        <h2>Códigos Disponibles</h2>
        <table border="1">
            <tr>
                <th>Código</th>
                <th>Acciones</th>
            </tr>
    `;
    codes.forEach((code, index) => {
        html += `
            <tr>
                <td>${code}</td>
                <td>
                    <form action="/admin/edit-code" method="POST" style="display:inline;">
                        <input type="hidden" name="index" value="${index}">
                        <input type="text" name="newCode" value="${code}" required>
                        <button type="submit">Editar</button>
                    </form>
                    <form action="/admin/delete-code" method="POST" style="display:inline;">
                        <input type="hidden" name="index" value="${index}">
                        <button type="submit">Eliminar</button>
                    </form>
                </td>
                
            </tr>
        `;
    });
    html += `</table><br>`;

    // Formulario para añadir más códigos
    html += `
        <h2>Añadir Nuevos Códigos</h2>
        <form action="/admin/add-codes" method="POST">
            <label for="codes">Códigos (separados por comas):</label><br>
            <textarea id="codes" name="codes" rows="4" cols="50" required></textarea><br><br>
            <button type="submit">Añadir Códigos</button>
        </form><br><a href="/admin/login">Cerrar Sesión</a>
    `;

    res.send(html);
});

// Ruta para añadir códigos
app.post('/admin/add-codes', (req, res) => {
    const { codes: newCodes } = req.body;

    if (!newCodes) {
        return res.status(400).send('No se enviaron códigos.');
    }

    // Dividir los códigos ingresados por comas y agregar a la lista actual
    const codesArray = newCodes.split(',').map(code => code.trim()).filter(code => code !== '');
    codes = [...codes, ...codesArray];
    fs.writeFileSync('codes.json', JSON.stringify({ codes }));

    // Redirigir nuevamente a la página de registros
    res.redirect('/admin/records');
});

// Ruta para editar un código
app.post('/admin/edit-code', (req, res) => {
    const { index, newCode } = req.body;

    if (index === undefined || !newCode) {
        return res.status(400).send('Datos incompletos para editar el código.');
    }

    // Actualizar el código en la posición indicada
    codes[index] = newCode.trim();
    fs.writeFileSync('codes.json', JSON.stringify({ codes }));

    // Redirigir a la página de registros
    res.redirect('/admin/records');
});

// Ruta para eliminar un código
app.post('/admin/delete-code', (req, res) => {
    const { index } = req.body;

    if (index === undefined) {
        return res.status(400).send('No se especificó el índice del código a eliminar.');
    }

    // Eliminar el código en la posición indicada
    codes.splice(index, 1);
    fs.writeFileSync('codes.json', JSON.stringify({ codes }));

    // Redirigir a la página de registros
    res.redirect('/admin/records');
});

// Iniciar el servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});