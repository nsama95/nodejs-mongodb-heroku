const express = require('express')
router = express.Router();
const db= require('../models/db');
//const { query } = require('express');

//todos los tickets
router.get('/', (req, res) => {
    dbTickets = db.getInstance();
    dbTickets.collection("tickets")
        .find()
        .toArray(function (err, items) {
            res.send(items);
        });
})


//tickets con desperfectos
router.get('/tickets-desperfectos', (req, res) => {
    dbTickets = db.getInstance();
    dbTickets.collection("tickets")
        .aggregate([{ $match: { motivo:{ $eq: "desperfecto" }}}])
        .toArray(function (err, items) {
            res.send(items);
        });
})

//cantidad de tickets resueltos por desperfecto
router.get('/tickets-desperfectos-cantidad', (req, res) => {
    dbTickets = db.getInstance();
    dbTickets.collection("tickets")
        .aggregate([
            { $unwind: "$motivo" },
            {
                $match: {
                    "motivo":"desperfecto"  ,"estado.informe.estado":false}   
            },
            { $group: { _id: "$descripcion",
            cantidad: 
            {$sum:
                { $cond: [ {$eq:["$estado.informe.estado", true]}, 1, 0 ] }  } 
           }}
        
        
        ]).toArray((err, result) => {
            if (err) return console.log(err)
            res.send(result)
        })
})
//cada cuantos dias hay desperfectos
router.get('/tickets-desperfectos-cada-cuanto', (req, res) => {
    dbTickets = db.getInstance();
    dbTickets.collection("tickets").aggregate([
        { $match: { motivo: "desperfecto" } },
        { $project: { _id: 0, fecha: 1 } },
        { $group: { _id: "$fecha", cantidad: { $sum: 1 } } }

    ]).toArray((err, result) => {
        if (err) return console.log(err)
        console.log(result[0].cantidad)
        let diaTotal=0;
        let dia;
        result.forEach( fecha=> {
            dia= fecha._id.split('-')[2];
            diaTotal += parseInt(dia);
        });
        res.send({ data: 'Suceden cada: '+ diaTotal +' dias aprox' });
   
    });
})
//zona de tickets desperfecto
router.get('/zona-desperfectas', (req, res) => {
    dbTickets = db.getInstance();
    dbTickets.collection("tickets")
        .aggregate([
            { $match: { motivo: "desperfecto" } },
            
		{
			$project: {descripcion: 1, zona : "$cliente.direccion.localidad.nombre"}
		},
            {
                $group: {
                    _id:"$zona",
                    descripciones: { $push: "$descripcion" }
                },
            },
            { $sort: { "_id": 1 } }
        ]).toArray((err, result) => {
            if (err) return console.log(err)
            res.send(result)
        })
})

//zona con mas centros
router.get('/zona-centros', (req, res) => {
    dbTickets = db.getInstance();
    dbTickets.collection("tickets")
        .aggregate([
            {
                $unwind: "$estado"
            },
            {
                $project: {centro: 1, zona: "$estado.centro.direccion.localidad.nombre"}
            },
            {
                $group: {_id:"$zona", cantCentros: {$sum: 1}}
            },
            {
                $sort: {_id: -1}
            },
            {
                $limit: 1
            }
        ]).toArray((err, result) => {
            if (err) return console.log(err)
            res.send(result)
        })
})

//zona con mas clientes
router.get('/zona-clientes', (req, res) => {
    dbTickets = db.getInstance();
    dbTickets.collection("tickets")
        .aggregate([
            {
                $unwind: "$cliente"
            },
            {
                $project: {centro: 1, zona: "$cliente.direccion.localidad.nombre"}
            },
            {
                $group: {_id:"$zona", cantClientes: {$sum: 1}}
            },
            {
                $sort: {_id: -1}
            },
            {
                $limit: 1
            }
        ]).toArray((err, result) => {
            if (err) return console.log(err)
            res.send(result)
        })
})
//empleado con mayor tickes asignados
router.get('/empleado-mayor-tickets', (req, res) => {
    dbTickets = db.getInstance();
    dbTickets.collection("tickets")
        .aggregate([
            { $unwind: "$estado" },
            { $project: { "estado.empleado": 1 } },
            {
                $group: {
                    _id: "$estado.empleado.id",
                    empleado: { "$first": "$estado.empleado.nombre" },
                    asignaciones: { $sum: 1 }
                }
            },
            { $sort: { asignaciones: -1 } },
            { $limit: 1 }
        ]).toArray((err, result) => {
            if (err) return console.log(err)
            res.send(result)
        })
})

//empleado con mayor tickets sin resolver
router.get('/empleado-mayor-tickets-sin-resolver', (req, res) => {
    dbTickets = db.getInstance();
    dbTickets.collection("tickets")
        .aggregate([
            { $unwind: "$estado" },
            {
                $match: {
                    "estado.informe.estado": { $nin: [true] }
                }
            },
            {
                $project: {
                    _id: 0,
                    fecha: 1,
                    descripcion: 1,
                    "estado.informe.descripcion": 1,
                }
            }
        ]).toArray((err, result) => {
            if (err) return console.log(err)
            res.send(result)
        })
})

//empleado con tickets
router.get('/empleado-con-tickets', (req, res) => {
    dbTickets = db.getInstance();
    dbTickets.collection("tickets")
        .aggregate([
            { $unwind: "$estado" },
            {
                $group: {
                    _id: "$estado.empleado.nombre",
                    empleado: {
                        $first: {
                            idEmpleado: "$estado.empleado.id",
                            nombre: "$estado.empleado.nombre"
                        }
                    }
                },
            },
            { $sort: { "empleado.id": 1 } },
            {
                $lookup: {
                    from: "clientes",
                    as: "cliente",
                    localField: "empleado.nombre",
                    foreignField: "nombre"
                }
            },
            { $project: { "empleado.nombre": 1, "cliente.nombre": 1 } },
            { $match: { cliente: { $not: { $size: 0 } } } }
        ]).toArray((err, result) => {
            if (err) return console.log(err)
            res.send(result)
        })
})

//cliente con mas tickets
router.get('/cliente-con-mayor-tickets', (req, res) => {
    dbTickets = db.getInstance();
    dbTickets.collection("tickets")
        .aggregate([
            {
                $project: {cliente: "$cliente.nombre"}
            },
            {
                $group: {_id : "$cliente", tickets : {$sum : 1}}
            },
            {
                $sort: {cant: -1}
            },
            {
                $limit: 1
            }
        ]).toArray((err, result) => {
            if (err) return console.log(err)
            res.send(result)
        })
})

//cuantos centros hay cerca de la ubicacion del cliente
router.get('/centros-tickets', (req, res) => {
    dbTickets = db.getInstance();
    dbTickets.collection("tickets").find().forEach((ticket) => 
    {
        dbTickets.collection("centros").aggregate([
            {
                $geoNear: {
                    near: ticket.cliente.direccion.geometry,
                    distanceField: "dist.calculated",
                    maxDistance: 200000
                }
            },
            {
                $group: {
                    _id:ticket.cliente.nombre,
                    cantidadCentros: { $sum: 1 }
                }
            }
    
    ])}).toArray((err, result) => {
            if (err) return console.log(err)
            res.send(result)
        })
})

module.exports = router;