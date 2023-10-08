const express = require("express");
const app = express();
const path = require("path");
const mysql = require("mysql");
const cors = require("cors");
const fs = require("fs");
const csv = require("csv-parser");
const Papa = require('papaparse');
const moment=require("moment-timezone");

app.get("/", (req, res) => {
  //res.send(" Hello world!")
  res.sendFile(path.join(__dirname + "/index.html"));
});

const db = mysql.createConnection({
  host: "146.148.100.168", // Cambia esto por la dirección de tu servidor MySQL
  user: "cbramos",
  password: "52Gy8fzZLyR4",
  database: "sarym",
  port: 3306,
});

db.connect((err) => {
  if (err) {
    console.error("Error al conectar a la base de datos: " + err.message);
  } else {
    console.log("Conexión exitosa a la base de datos");
  }
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());
app.use(express.static("public"));

app.post("/guardar_datos", (req, res) => {
  const {
    NombreCompleto,
    Telefono,
    FechaAsignacion,
    Descripcion,
    Tipo = "Llamada",
    FechaConclusion = FechaAsignacion,
    Documentos = "src",
    IDColaborador = 1,
    Direccion_Calle = "CallePrueba",
  } = req.body;
  console.log(req.body.Telefono);
  // Inserta los datos en la base de datos
  const sql =
    "INSERT INTO Planificador (NombreCompleto, Telefono, FechaAsignacion, Descripcion, Tipo, FechaConclusion, Documentos, IDColaborador, Direccion_Calle) VALUES (?, ?, ?, ?, ?,?,?,?,?)";
  const values = [
    NombreCompleto,
    Telefono,
    FechaAsignacion,
    Descripcion,
    Tipo,
    FechaConclusion,
    Documentos,
    IDColaborador,
    Direccion_Calle,
  ];

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error(
        "Error al insertar datos en la base de datos: " + err.message
      );
      res.status(500).send("Error al guardar los datos en la base de datos");
    } else {
      console.log("Datos guardados correctamente");
      res.status(200).send("Datos guardados correctamente");
    }
  });
});

app.get("/SeguimientoLlamada", (req, res) => {
  const sql =
    'Select NombreCompleto, Telefono from Planificador Where Tipo="Llamada" and Telefono is not null and Incidentes is null';

  db.query(sql, (err, result) => {
    if (err) {
      console.error("Error al ejecutar la consulta: " + err.message);
      res.status(500).send("Error interno del servidor");
    } else {
      res.json(result);
    }
  });
});


app.put("/agregaIncidencia", (req, res) => {
  const telefono = req.body.telefono;
  const nuevaIncidencia = req.body.nuevaIncidencia; // Cambia el nombre del campo
  // Realiza la actualización en la base de datos
  const sql = "UPDATE Planificador SET Incidentes = ? WHERE Telefono = ?"; // Cambia el nombre de la columna a actualizar
  db.query(sql, [nuevaIncidencia, telefono], (err, result) => {
    if (err) {
      console.error("Error al actualizar: " + err.message);
      res.status(500).send("Error interno del servidor");
    } else {
      console.log("Actualización exitosa");
      res.status(200).send("Actualización exitosa");
    }
  });
});


//Segunda version
app.put('/agregarIncidencia2', (req, res) => {
  const telefono = req.body.telefono.Telefono;
  const nuevaIncidencia = req.body.nuevaIncidencia;
  console.log('Telefono:', telefono);
  console.log('Nueva Incidencia:', nuevaIncidencia);  
  // Realiza la actualización en la base de datos
  const sql = 'UPDATE Planificador SET Incidentes = ? WHERE Telefono = ?';
  db.query(sql, [nuevaIncidencia, telefono], (err, result) => {
    if (err) {
      console.error('Error al actualizar: ' + err.message);
      return res.status(500).send('Error interno del servidor');
    } else {
      console.log('Actualización exitosa');
      res.status(200).send('Actualización exitosa');
    }
  });
});



//TerceraVersion
app.put('/agregarIncidencia3', (req, res) => {
  const telefono = req.body.telefono.Telefono;
  const nuevaIncidencia = req.body.nuevaIncidencia;

  // Obtén la fecha y hora actual en GMT-6 (Central Standard Time, CST)
  const fechaActual = moment().tz('America/Mexico_City').format('YYYY-MM-DD HH:mm:ss');

  // Realiza la actualización en la base de datos
  const sql = 'UPDATE Planificador SET Incidentes = ?, FechaSeguimiento = ? WHERE Telefono = ?';
  db.query(sql, [nuevaIncidencia, fechaActual, telefono], (err, result) => {
    if (err) {
      console.error('Error al actualizar: ' + err.message);
      return res.status(500).send('Error interno del servidor');
    } else {
      console.log('Actualización exitosa');
      res.status(200).send('Actualización exitosa');
    }
  });
});



app.get('/exportarLlamada', (req, res) => {
  // Realiza una consulta a la base de datos para obtener los datos de la tabla Planificador
  const sql = 'SELECT * FROM Planificador WHERE Tipo = ? and Incidentes is not null'; // Ajusta 'Tipo' y 'Llamada' según tu esquema de base de datos
  db.query(sql, ['Llamada'], (err, data) => {
    if (err) {
      console.error('Error al obtener datos: ' + err.message);
      res.status(500).send('Error interno del servidor');
    } else {
      // Crear un objeto CSV con encabezados y datos alineados
      const csv = data.map((row) => ({
        ID: row.ID,
        NombreCompleto: row.NombreCompleto,
        Telefono: row.Telefono,
        Incidentes: row.Incidentes,
        FechaAsignacion: row.FechaAsignacion,
        FechaSeguimiento: row.FechaSeguimiento,
        Descripcion: row.Descripcion,
        Documentos: row.Documentos,
      }));

      // Convertir el objeto CSV en una cadena CSV
      const csvData = Papa.unparse(csv, { header: true });

      // Agregar encabezados para controlar la caché
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=planificador.csv');
      res.setHeader('Cache-Control', 'no-store'); // Deshabilitar la caché del navegador
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.send(csvData);
    }
  });
});




app.listen(3005, () => {
  console.log("server is running on port ", 3005);
});
