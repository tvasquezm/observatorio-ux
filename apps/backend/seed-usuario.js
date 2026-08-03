const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

p.usuario.create({
  data: {
    nombre: 'Docente Tester',
    email: 'evaluador@observatorioux.com',
    rol: 'DOCENTE',
  },
}).then(u => {
  console.log('Usuario creado:', u);
  p.$disconnect();
}).catch(e => {
  console.error(e);
  p.$disconnect();
});
