const express = require("express");
const app = express();
const path = require("path");
const mysql = require("mysql");
const cors = require("cors");
const fs = require("fs");
const csv = require("csv-parser");
const Papa = require('papaparse');


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


//AgregarLlamada
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
  const sql =
    "INSERT INTO Planificador (NombreCompleto, Telefono, FechaAsignacion, Descripcion, Tipo, FechaConclusion, Documentos, IDColaborador, Direccion_Calle) VALUES (?, ?, STR_TO_DATE(?, '%Y-%m-%dT%H:%i:%s.%fZ'), ?, ?,STR_TO_DATE(?, '%Y-%m-%dT%H:%i:%s.%fZ'),?,?,?)";
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

//SeguimientoLLamada, dropdown
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

/* 
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

*/

//Agregar Incidencia llamada
app.put('/agregarIncidencia', (req, res) => {
  const telefono = req.body.telefono.Telefono;
  const nuevaIncidencia = req.body.nuevaIncidencia;
  const nombre=req.body.telefono.NombreCompleto;
  const fechaActual = moment().tz('America/Mexico_City').format('YYYY-MM-DD HH:mm:ss');
  const sql = 'UPDATE Planificador SET Incidentes = ?, FechaSeguimiento = ? WHERE Telefono = ? and NombreCompleto = ?';
  db.query(sql, [nuevaIncidencia, fechaActual, telefono, nombre], (err, result) => {
    if (err) {
      console.error('Error al actualizar: ' + err.message);
      return res.status(500).send('Error interno del servidor');
    } else {
      console.log('Actualización exitosa');
      res.status(200).send('Actualización exitosa');
    }
  });
});


//Crear el CSV con las llamadas ya atendidas
app.get('/exportarLlamada', (req, res) => {
  const sql = 'SELECT * FROM Planificador WHERE Tipo = ? and Incidentes is not null';
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

/*
app.post("/guardar_datos_visita", (req, res) => {  
  const { NombreCompleto, Telefono, FechaAsignacion, Direccion_Calle, Direccion_Num_Ext, Direccion_Num_Int, Direccion_CP, Direccion_Colonia, Sitioweb,  Descripcion, Tipo="Visita_Programada", FechaConclusion=FechaAsignacion , Documentos='src', IDColaborador=1,   } = req.body;
  // Inserta los datos en la base de datos
  const sql =
    "INSERT INTO Planificador (NombreCompleto, Telefono, FechaAsignacion, Direccion_Calle, Direccion_Num_Ext, Direccion_Num_Int, Direccion_CP, Direccion_Colonia, Sitioweb, Descripcion, Tipo, FechaConclusion, Documentos, IDColaborador) VALUES (?, ?, STR_TO_DATE(?, '%Y-%m-%dT%H:%i:%s.%fZ'), ?,?,?,?,?,?,?,?,STR_TO_DATE(?, '%Y-%m-%dT%H:%i:%s.%fZ'),?,?)";
  const values = [NombreCompleto, Telefono, FechaAsignacion, Direccion_Calle, Direccion_Num_Ext, Direccion_Num_Int, Direccion_CP, Direccion_Colonia, Sitioweb, Descripcion, Tipo, FechaConclusion, Documentos, IDColaborador];

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
*/

//Guardar datos visitaProgramada para todos los colab
app.post("/guardar_datos_visita", (req, res) => {
  const { NombreCompleto, Telefono, FechaAsignacion, Direccion_Calle, Direccion_Num_Ext, Direccion_Num_Int, Direccion_CP, Direccion_Colonia, Sitioweb,  Descripcion, Tipo="Visita_Programada", FechaConclusion=FechaAsignacion , Documentos='src', IDColaborador=1,   } = req.body;
  // Inserta los datos en la base de datos
  const sql =
    "INSERT INTO Planificador (NombreCompleto, Telefono, FechaAsignacion, Direccion_Calle, Direccion_Num_Ext, Direccion_Num_Int, Direccion_CP, Direccion_Colonia, Sitioweb, Descripcion, Tipo, FechaConclusion, Documentos, IDColaborador) VALUES (?, ?, STR_TO_DATE(?, '%Y-%m-%dT%H:%i:%s.%fZ'), ?,?,?,?,?,?,?,?,STR_TO_DATE(?, '%Y-%m-%dT%H:%i:%s.%fZ'),?,?)";
  const values = [NombreCompleto, Telefono, FechaAsignacion, Direccion_Calle, Direccion_Num_Ext, Direccion_Num_Int, Direccion_CP, Direccion_Colonia, Sitioweb, Descripcion, Tipo, FechaConclusion, Documentos, IDColaborador];

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
  
//app.post("/guardar_datos_cambaceo", (req, res) => {  
//const {
  //  NombreCompleto,
  //  Telefono,
  //  FechaAsignacion,
  //  Direccion_Calle,
  //  Direccion_Num_Ext,
  //  Direccion_Num_Int,
  //  Direccion_CP,
  //  Direccion_Colonia,
  //  Sitioweb,
  //  Descripcion,
  //  Tipo = "Cambaceo_Diario",
  //  FechaConclusion = FechaAsignacion,
  //  Documentos,
  //} = req.body;
  //// Obtener la lista de colaboradores activos
  //const obtenerColaboradoresActivos = "SELECT id AS IDColaborador FROM Colaborador WHERE Activo = 1";
  //db.query(obtenerColaboradoresActivos, (err, colaboradores) => {
  //  if (err) {
  //    console.error("Error al obtener colaboradores activos: " + err.message);
  //    res.status(500).send("Error al obtener la lista de colaboradores activos");
  //    return;
  //  }
  //  // Iterar sobre la lista de colaboradores y realizar la inserción de datos
  //  colaboradores.forEach((colaborador) => {
  //    const sql =
  //      "INSERT INTO Planificador (NombreCompleto, Telefono, FechaAsignacion, Direccion_Calle, Direccion_Num_Ext, Direccion_Num_Int, Direccion_CP, Direccion_Colonia, Sitioweb, Descripcion, Tipo, FechaConclusion, Documentos, IDColaborador) VALUES (?, ?, STR_TO_DATE(?, '%Y-%m-%dT%H:%i:%s.%fZ'), ?,?,?,?,?,?,?,?,STR_TO_DATE(?, '%Y-%m-%dT%H:%i:%s.%fZ'),?,?)";
//
  //    const values = [
  //      NombreCompleto,
  //      Telefono,
  //      FechaAsignacion,
  //      Direccion_Calle,
  //      Direccion_Num_Ext,
  //      Direccion_Num_Int,
  //      Direccion_CP,
  //      Direccion_Colonia,
  //      Sitioweb,
  //      Descripcion,
  //      Tipo,
  //      FechaConclusion,
  //      Documentos,
  //      colaborador.IDColaborador, // Usar el IDColaborador del colaborador activo actual
  //    ];
//
  //    db.query(sql, values, (err, result) => {
  //      if (err) {
  //        console.error("Error al insertar datos en la base de datos: " + err.message);
  //      } else {
  //        console.log("Datos guardados correctamente para el colaborador con ID " + colaborador.IDColaborador);
  //      }
  //    });
  //  });

  //  res.status(200).send("Datos guardados correctamente para todos los colaboradores activos");
  //});

app.get("/SeguimientoVisita", (req, res) => {
  const sql =
    'Select NombreCompleto, Telefono from Planificador Where Tipo="Visita_Programada" and Telefono is not null and Incidentes is null';
  db.query(sql, (err, result) => {
    if (err) {
      console.error("Error al ejecutar la consulta: " + err.message);
      res.status(500).send("Error interno del servidor");
    } else {
      res.json(result);
    }
  });
});



app.listen(3005, () => {
  console.log("server is running on port ", 3005);
});





app.get('/exportarCambaceoDiario', (req, res) => {
  const fecha = req.query.fecha;
  const idColaborador = req.query.id;

  const sql = `SELECT ID, NombreCompleto, Telefono, FechaAsignacion, FechaConclusion, Descripcion, Documentos,
               Direccion_Calle, Direccion_Num_Ext, Direccion_Num_Int, Direccion_CP, Direccion_Colonia
               FROM Planificador
               WHERE Tipo = 'Cambaceo_Diario'
               AND FechaAsignacion = ?
               AND IDColaborador = ?`;

  db.query(sql, [fecha, idColaborador], (err, results) => {
    if (err) {
      console.error('Error al consultar la base de datos: ' + err.message);
      return res.status(500).send('Error interno del servidor');
    }

    if (results.length === 0) {
      // Si no hay resultados, envía una respuesta JSON al frontend
      return res.json({ empty: true });
    }

    const csv = results.map((row) => ({
      ID: row.ID,
      NombreCompleto: row.NombreCompleto,
      Telefono: row.Telefono,
      FechaAsignacion: row.FechaAsignacion,
      FechaConclusion: row.FechaConclusion,
      Descripcion: row.Descripcion,
      Documentos: row.Documentos,
      Calle: row.Direccion_Calle,
      Numero_Exterior: row.Direccion_Num_Ext,
      Numero_Interior: row.Direccion_Num_Int,
      Codigo_Postal: row.Direccion_CP,
      Colonia: row.Direccion_Colonia,
    }));
    const csvData = Papa.unparse(csv, { header: true });

    // Configurar las cabeceras para la descarga del archivo
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=planificador.csv');
    res.setHeader('Cache-Control', 'no-store'); // Deshabilitar la caché del navegador
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.send(csvData);
  });
});



app.get('/exportarCambaceoSemanal', (req, res) => {
  const fecha = req.query.fecha;
  const idColaborador = req.query.id;

  const sql = `SELECT ID, NombreCompleto, Telefono, FechaAsignacion, FechaConclusion, Descripcion, Documentos,
               Direccion_Calle, Direccion_Num_Ext, Direccion_Num_Int, Direccion_CP, Direccion_Colonia
               FROM Planificador
               WHERE Tipo = 'Cambaceo_Semanal'
               AND FechaAsignacion <= ?
               AND FechaConclusion <= ?
               AND IDColaborador = ?`;

  db.query(sql, [fecha, fecha, idColaborador], (err, results) => {
    if (err) {
      console.error('Error al consultar la base de datos: ' + err.message);
      return res.status(500).send('Error interno del servidor');
    }

    if (results.length === 0) {
      // Si no hay resultados, envía una respuesta JSON al frontend
      return res.json({ empty: true });
    }

    const csv = results.map((row) => ({
      ID: row.ID,
      NombreCompleto: row.NombreCompleto,
      Telefono: row.Telefono,
      FechaAsignacion: row.FechaAsignacion,
      FechaConclusion: row.FechaConclusion,
      Descripcion: row.Descripcion,
      Documentos: row.Documentos,
      Calle: row.Direccion_Calle,
      Numero_Exterior: row.Direccion_Num_Ext,
      Numero_Interior: row.Direccion_Num_Int,
      Codigo_Postal: row.Direccion_CP,
      Colonia: row.Direccion_Colonia,
    }));
    const csvData = Papa.unparse(csv, { header: true });

    // Configurar las cabeceras para la descarga del archivo
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=planificador.csv');
    res.setHeader('Cache-Control', 'no-store'); // Deshabilitar la caché del navegador
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.send(csvData);
  });
});



//Nuevo seguimiento Visita
app.get('/getVisitas', (req, res) => {
  const query = 'SELECT * FROM Planificador WHERE tipo = ?';

  db.query(query, ['Visita_Programada'], (error, results) => {
    if (error) {
      console.error('Error fetching data:', error);
      res.status(500).json({ success: false, message: 'Error fetching data' });
    } else {
      res.json(results);
    }
  });
});

app.put('/api/agregarIncidencia/:id', (req, res) => {
  const { ID } = req.params;
  const { incidencia } = req.body;

  // Verifica si la incidencia no está vacía
  if (!incidencia || incidencia.trim() === '') {
    return res.status(400).json({ error: 'El campo de incidencia no puede estar vacío' });
  }

  // Lógica para actualizar la incidencia en la base de datos
  const query = 'UPDATE Planificador SET incidencia = ? WHERE ID = ?';
  db.query(query, [incidencia, ID], (error, results) => {
    if (error) {
      console.error('Error al agregar incidencia:', error);
      return res.status(500).json({ error: 'Hubo un error al agregar la incidencia' });
    }

    return res.status(200).json({ success: true });
  });
});

app.get('/getLlamadas', (req, res) => {
  const query = 'SELECT * FROM Planificador WHERE tipo = ?';

  db.query(query, ['Llamada'], (error, results) => {
    if (error) {
      console.error('Error fetching data:', error);
      res.status(500).json({ success: false, message: 'Error fetching data' });
    } else {
      res.json(results);
    }
  });
});


const moment = require('moment');
const { error } = require("console");

app.get('/exportarCambaceoSemanal', (req, res) => {
  // Obtener la fecha actual
  const fechaPeticion = moment();

  // Calcular la fecha del próximo lunes y domingo
  const fechaAsignacion = fechaPeticion.clone().startOf('isoWeek').add(1, 'weeks');
  const fechaFin = fechaPeticion.clone().endOf('isoWeek').add(1, 'weeks');

  const fechaAsignacionFormat = fechaAsignacion.format('YYYY-MM-DD');
  const fechaFinFormat = fechaFin.format('YYYY-MM-DD');

  console.log('Fecha de inicio:', fechaAsignacionFormat);
  console.log('Fecha de fin:', fechaFinFormat);

  const sql =
    'SELECT * FROM Planificador WHERE Tipo = ? AND Incidentes IS NOT NULL AND FechaAsignacion >= ? AND FechaConclusion <= ?';

  db.query(sql, ['Cambaceo_Semanal', fechaAsignacionFormat, fechaFinFormat], (err, data) => {
    if (err) {
      console.error('Error al obtener datos: ' + err.message);
      return res.status(500).json({
        error: 'Error interno del servidor',
      });
    }

    const responseData = {
      fechaAsignacion: fechaAsignacionFormat,
      fechaFin: fechaFinFormat,
    };

    if (data.length === 0) {
      // No hay datos
      responseData.empty = true;
      return res.json(responseData);
    }

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

    // Configurar las cabeceras para indicar que se está enviando un archivo descargable
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=planificador.csv');

    // Agregar las fechas al objeto de respuesta
    responseData.empty = false;
    responseData.csvData = csvData;

    // Enviar la respuesta
    res.json(responseData);
  });
});

app.get('/imprimirFechas', (req, res) => {
  // Obtener la fecha actual
  const fechaPeticion = moment();

  // Calcular la fecha del próximo lunes y domingo
  const fechaAsignacion = fechaPeticion.clone().startOf('isoWeek').add(1, 'weeks');
  const fechaFin = fechaPeticion.clone().endOf('isoWeek').add(1, 'weeks');

  console.log('Fecha de inicio:', fechaAsignacion.format('YYYY-MM-DD'));
  console.log('Fecha de fin:', fechaFin.format('YYYY-MM-DD'));

  // Realizar la consulta SQL
  const sql =
    'SELECT * FROM Planificador WHERE Tipo = ? AND FechaAsignacion >= ? AND FechaConclusion <= ?';
  
  const params = ['Cambaceo_Semanal', fechaAsignacion.format('YYYY-MM-DD'), fechaFin.format('YYYY-MM-DD')];

  db.query(sql, params, (err, data) => {
    if (err) {
      console.error('Error al realizar la consulta SQL: ' + err.message);
      return res.status(500).send('Error interno del servidor.');
    }

    console.log('Respuesta de la consulta SQL:', data);

    // Crear un objeto CSV con los encabezados específicos
    const csvData = Papa.unparse(data.map((row) => ({
      IDColaborador: row.ID,
      NombreCompleto: row.NombreCompleto,
      FechaAsignacion: row.FechaAsignacion,
      FechaConclusion: row.FechaConclusion,
      Descripcion: row.Descripcion,
      Telefono: row.Telefono,
      Calle: row.Direccion_Calle,
      Numero_Exterior: row.Direccion_Num_Ext,
      Numero_Interior: row.Direccion_Num_Int,
      Codigo_Postal: row.Direccion_CP,
      Colonia: row.Direccion_Colonia,
    })), { header: true });

    // Guardar el CSV en un archivo
   // Enviar el CSV como respuesta al cliente
   res.attachment('resultado_consulta.csv').send(csvData);
  });
});



app.get("/lider_info", async (req, res) => {
  const user_email=req.query.usuario.email.toString();
  const query='Select L.Nombre, L.Apellido_pat, L.Apellido_mat, L.Correo, L.Telefono  from Colaborador C inner join Lider L  on C.IDLider=L.IDBD where C.Correo=?;';
  db.query(query, [user_email],(error, resuts)=>{
    if(error){
      console.log("Error fetching data: ", error);
      res.status(500).json({success: false, message: "Error fetching data"});
    }else{
      res.json(resuts)
    }
  })

});

app.get("/Colaborador_Info", async (req, res) => {
  try {
    const user_email = req.query.email.toString();
    const Tipo = req.query.Tipo.toString();
    
    const query = "Select * from Usuarios U inner join Planificador P on P.IDUsuarioAsignado=U.idUsuario where U.Correo=? and P.Tipo=?";
    
    db.query(query, [user_email, Tipo], (error, results) => {
      if (error) {
        console.log("Error fetching data: ", error);
        res.status(500).json({ success: false, message: "Error fetching data" });
      } else {
        res.json(results);
        
      }
    });
  } catch (error) {
    console.error("Error en la solicitud Colaborador_Info:", error);
    res.status(500).json({ success: false, message: "Error interno del servidor" });
  }
});

app.get("/api/getPlanificador/:id", (req, res) => {
  const id = req.params.id;
  console.log("Esta recibes",req.params)

  // Realiza la consulta SQL
  db.query("SELECT * FROM Planificador WHERE idPlanificador = ?", [id], (err, results) => {
    if (err) {
      console.error("Error en la consulta SQL:", err);
      res.status(500).send("Error en el servidor");
      return;
    }

    // Envía los resultados como respuesta
    res.json(results);
    console.log(results)
  });
});

app.put("/api/putPlanificador/:id", (req, res) => {
  const { id } = req.params;
  const { Incidentes } = req.body;

  // Actualiza la incidencia en la base de datos
  const sql = "UPDATE Planificador SET Incidentes = ? WHERE ID = ?";
  db.query(sql, [Incidentes, id], (err, result) => {
    if (err) {
      console.error("Error al actualizar incidencia en la base de datos:", err);
      res.status(500).json({ error: "Error al actualizar incidencia en la base de datos" });
    } else {
      console.log("Incidencia actualizada con éxito en la base de datos");
      res.status(200).json({ success: true });
    }
  });
});