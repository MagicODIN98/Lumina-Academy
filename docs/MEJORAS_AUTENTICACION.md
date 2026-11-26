# Mejoras del sistema de autenticación — Lumina Academy

**Proyecto:** Lumina Academy (CRYSTAL)

**Módulo:** Autenticación de usuarios y seguridad de perfiles

**Tecnologías:** JavaScript, Firebase Authentication y Firebase Realtime Database

**Rama de desarrollo:** `feature/mejoras-firebase-login`

**Fecha de documentación:** 25 de noviembre de 2026

---

## 1. Descripción general

Se realizaron mejoras al módulo de autenticación de Lumina Academy con el propósito de fortalecer el acceso de los estudiantes, corregir comportamientos inconsistentes y conectar la aplicación con los servicios reales de Firebase.

El proyecto contaba previamente con interfaces de registro, inicio de sesión y recuperación de contraseñas, además de funciones de autenticación mediante Firebase. Sin embargo, la configuración web contenía valores de ejemplo, por lo que la aplicación funcionaba principalmente en modo demostración y utilizaba almacenamiento local para simular usuarios.

Las modificaciones permiten diferenciar el acceso demostrativo de la autenticación real, validar la información de entrada, controlar la navegación hacia el dashboard y gestionar perfiles de estudiantes mediante Firebase.

## 2. Objetivos

### Objetivo general

Mejorar la funcionalidad y la seguridad del módulo de autenticación de Lumina Academy mediante la integración y configuración de Firebase Authentication y Realtime Database.

### Objetivos específicos

- Corregir las validaciones del formulario de inicio de sesión.
- Evitar que el modo demostración se confunda con una autenticación real.
- Habilitar el registro y la autenticación mediante Firebase.
- Implementar la recuperación funcional de contraseñas mediante correo electrónico.
- Comprobar la persistencia y recuperación de perfiles.
- Restringir las operaciones de lectura y escritura de perfiles según el UID del usuario autenticado.
- Realizar pruebas funcionales y simulaciones de seguridad.

## 3. Arquitectura del módulo

La solución aprovecha la estructura existente del repositorio, sin incorporar nuevos frameworks al frontend.

**Firebase Authentication** administra las credenciales, el registro, las sesiones y la recuperación de contraseñas.

**Firebase Realtime Database** almacena la información adicional del estudiante, incluyendo su nombre, correo electrónico, universidad y área académica.

**JavaScript del frontend** conecta los formularios con los servicios de Firebase y gestiona los mensajes, la navegación y la presentación del perfil.

El funcionamiento general es:

1. El estudiante introduce sus datos en el formulario.
2. Firebase Authentication valida o crea su cuenta.
3. La aplicación utiliza el UID para guardar o recuperar el perfil en Realtime Database.
4. El dashboard consulta el estado de autenticación antes de presentar su contenido.
5. Las reglas de Realtime Database restringen el acceso a los perfiles.

## 4. Mejoras implementadas

### 4.1. Validación del inicio de sesión

Se corrigió la validación del correo electrónico para rechazar entradas que no cumplen un formato básico válido.

También se modificó el tratamiento de las contraseñas para evitar eliminar automáticamente espacios que pudieran formar parte de ellas.

Se conservaron los mecanismos existentes de presentación de errores y deshabilitación temporal del botón durante el inicio de sesión.

### 4.2. Separación del modo demostración

Anteriormente, cuando Firebase no estaba configurado, el formulario de login podía aceptar credenciales arbitrarias y generar un usuario simulado.

Se separaron ambos comportamientos:

- **Inicio de sesión real:** utiliza Firebase Authentication y no debe aceptar credenciales simuladas.
- **Modo DEMO:** permite probar la interfaz local mediante un botón independiente.

La modalidad de demostración se habilita únicamente para `localhost` o `127.0.0.1`, cuando Firebase no está inicializado.

Se utiliza `sessionStorage` para identificar el acceso de demostración y se limpia su indicador al cerrar la sesión.

El modo DEMO no equivale a una sesión autenticada ni debe emplearse para acceder a datos privados o servicios protegidos.

### 4.3. Control de acceso al dashboard

Se incorporó una comprobación de sesión antes de inicializar el contenido del dashboard.

Cuando no se detecta una sesión admitida por el mecanismo correspondiente, el navegador redirige al formulario de inicio de sesión.

Asimismo, se agregó un control de visibilidad que evita mostrar brevemente el dashboard durante la comprobación inicial.

Este control mejora la navegación y la experiencia de usuario. La protección efectiva de los datos depende de Firebase Authentication y las reglas de seguridad del servicio.

### 4.4. Recuperación de contraseña

Se corrigió la carga de las dependencias de Firebase en la pantalla de recuperación.

Se eliminó la respuesta simulada que anteriormente podía indicar el envío exitoso de instrucciones sin que existiera una conexión real con Firebase.

La funcionalidad utiliza el servicio de recuperación de Firebase Authentication.

**Prueba realizada:** se solicitó el restablecimiento de una cuenta de prueba, se recibió el mensaje por correo electrónico, se estableció una contraseña nueva y se confirmó el acceso posterior a la plataforma.

### 4.5. Registro y almacenamiento de perfiles

Se conectó la aplicación con el proyecto Firebase correspondiente a Lumina Academy.

Firebase Authentication permite crear la cuenta de usuario y Realtime Database almacena el perfil adicional utilizando una estructura basada en el UID.

La estructura empleada es:

```text
users/
  {uid}/
    email
    firstName
    lastName
    name
    university
    universityName
    universityImage
    area
    areaName
    createdAt
    updatedAt
```

**Prueba realizada:** se registró una cuenta de prueba y se comprobó su existencia tanto en Firebase Authentication como en Realtime Database.

Posteriormente se inició sesión y se verificó que el dashboard recuperara correctamente el nombre, correo, universidad y área académica.

## 5. Configuración de Firebase

Se registró una aplicación web dentro del proyecto Firebase existente y se incorporó su configuración en `frontend/js/firebase-config.js`.

La aplicación utiliza Firebase mediante scripts compatibles con la arquitectura JavaScript existente, sin requerir una migración a npm.

Se habilitaron y utilizaron los siguientes servicios:

| Servicio | Uso |
|---|---|
| Firebase Authentication | Registro, inicio de sesión y recuperación de contraseña |
| Realtime Database | Persistencia de perfiles de estudiantes |
| Aplicación web Firebase | Configuración de conexión del frontend |

La configuración web no incluye credenciales administrativas. Las claves privadas de cuentas de servicio no deben incorporarse al repositorio.

## 6. Reglas de seguridad de Realtime Database

Se sustituyeron las reglas temporales de acceso general por reglas basadas en autenticación y pertenencia del perfil.

El archivo `database.rules.json` documenta la configuración:

```json
{
  "rules": {
    ".read": false,
    ".write": false,
    "users": {
      "$uid": {
        ".read": "auth != null && auth.uid === $uid",
        ".write": "auth != null && auth.uid === $uid"
      }
    }
  }
}
```

Estas reglas restringen las operaciones de lectura y escritura en `users/{uid}` al usuario autenticado cuyo UID coincide con el identificador de la ruta.

Las reglas fueron publicadas en Firebase Console y documentadas en el repositorio. El archivo JSON no se despliega automáticamente al modificarlo en Git.

## 7. Pruebas funcionales

Se realizaron pruebas locales utilizando un servidor HTTP y el navegador web.

| ID | Prueba | Resultado |
|---|---|---|
| PF-01 | Rechazar correo con formato inválido | Correcto |
| PF-02 | Conservar los caracteres de la contraseña | Cambio implementado; pendiente una prueba específica con espacios |
| PF-03 | Redirigir al login cuando no existe sesión | Correcto |
| PF-04 | Evitar mostrar el dashboard antes de validar la sesión | Correcto |
| PF-05 | Separar el modo DEMO del login real | Correcto |
| PF-06 | Registrar un estudiante mediante Firebase Authentication | Correcto |
| PF-07 | Guardar el perfil en Realtime Database | Correcto |
| PF-08 | Recuperar el perfil después de iniciar sesión | Correcto |
| PF-09 | Solicitar y recibir correo de recuperación | Correcto |
| PF-10 | Cambiar contraseña e iniciar sesión con la nueva | Correcto |

Los resultados corresponden a pruebas realizadas durante el desarrollo; no representan una auditoría completa de la aplicación.

## 8. Pruebas de reglas de seguridad

Se utilizó la Zona de pruebas de reglas de Firebase Realtime Database para simular operaciones autenticadas y no autenticadas.

| ID | Operación simulada | Resultado esperado | Resultado obtenido |
|---|---|---|---|
| PS-01 | Lectura pública de `/users` | Denegada | Denegada |
| PS-02 | Lectura del perfil propio | Permitida | Permitida |
| PS-03 | Lectura de un perfil ajeno | Denegada | Denegada |
| PS-04 | Escritura en un perfil ajeno | Denegada | Denegada |
| PS-05 | Escritura en el perfil propio | Permitida | Permitida |

**Resultado:** 5 de 5 simulaciones respondieron conforme a las reglas establecidas.

Estas pruebas comprueban los escenarios evaluados en el simulador. No sustituyen pruebas integrales de seguridad ni validaciones adicionales de los datos.

## 9. Archivos involucrados

| Archivo | Función |
|---|---|
| `frontend/js/login.js` | Validaciones y acceso al login |
| `frontend/js/auth-functions.js` | Funciones de autenticación y modalidad DEMO |
| `frontend/js/recover.js` | Recuperación de contraseña |
| `frontend/js/new_user.js` | Registro de usuarios |
| `frontend/js/firebase-config.js` | Configuración e inicialización de Firebase |
| `frontend/pages/login.html` | Formulario de inicio de sesión |
| `frontend/pages/recover.html` | Formulario de recuperación |
| `frontend/pages/app.js` | Inicialización del dashboard y comprobación de sesión |
| `frontend/pages/dashboard.html` | Presentación del dashboard |
| `database.rules.json` | Reglas de acceso a perfiles |

## 10. Control de versiones

Las mejoras se desarrollaron en la rama:

`feature/mejoras-firebase-login`

Commits registrados:

| Commit | Descripción |
|---|---|
| `691033c` | Mejoras de validación, recuperación y control de acceso |
| `906aab6` | Separación de Firebase y modo DEMO |
| `ee3f5dd` | Configuración de la aplicación web Firebase |
| `c770161` | Documentación de las reglas de seguridad |

La implementación se mantuvo separada de la rama principal para facilitar su revisión mediante Pull Request.

## 11. Limitaciones y mejoras futuras

Aunque el flujo principal de autenticación se encuentra operativo en las pruebas realizadas, quedan aspectos que requieren atención:

- Incorporar validaciones de estructura, tipos y campos permitidos en Realtime Database.
- Revisar el manejo de sesiones y la persistencia del estado de autenticación en todos los escenarios.
- Evaluar la verificación obligatoria del correo electrónico.
- Comprobar la consistencia de los datos cuando se crea una cuenta, pero falla el guardado del perfil.
- Revisar el comportamiento del sistema al perder la conexión con Firebase.
- Realizar pruebas automatizadas de autenticación.
- Proteger mediante reglas independientes los futuros roles administrativos y las estadísticas oficiales.
- Verificar que los cambios de interfaz y los controles de autenticación permanezcan compatibles con otros módulos del proyecto.

La configuración actual está orientada a la autenticación de estudiantes y no debe considerarse una solución completa de autorización para toda la plataforma.

## 12. Conclusión

Las mejoras permitieron pasar de un esquema de autenticación principalmente demostrativo a un flujo funcional conectado con Firebase Authentication y Realtime Database.

Se verificaron el registro de cuentas, el almacenamiento de perfiles, el inicio de sesión, la recuperación de contraseñas y la aplicación de restricciones de acceso basadas en UID.

El trabajo aprovecha la arquitectura existente y proporciona una base más sólida para continuar con el desarrollo del Backend de Lumina Academy, manteniendo identificadas las limitaciones y tareas futuras.