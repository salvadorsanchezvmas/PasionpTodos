**PM2** es un administrador de procesos para Node.js excelente para entornos de producción, ya que mantiene tus aplicaciones vivas para siempre, las recarga sin tiempo de inactividad (zero-downtime) y facilita el monitoreo.

Aquí tienes una hoja de trucos con los comandos más importantes y utilizados, divididos por categorías:

### 1. Iniciar Aplicaciones

La forma más básica de arrancar tu aplicación en segundo plano.

- **Iniciar un archivo simple:**
  ```bash
  pm2 start app.js
  ```
- **Iniciar y darle un nombre personalizado:**
  ```bash
  pm2 start app.js --name "mi-api-backend"
  ```
- **Iniciar usando un script de npm (ej. `npm run start`):**
  ```bash
  pm2 start npm --name "mi-app" -- run start
  ```
- **Iniciar en "Modo Clúster" (Aprovecha todos los núcleos del CPU):**
  ```bash
  pm2 start app.js -i max
  ```

### 2. Listar y Gestionar Procesos

Una vez que tus aplicaciones están corriendo, necesitas administrarlas usando su **ID** o su **Nombre**.

- **Listar todos los procesos activos:** (Tu comando más usado)
  ```bash
  pm2 list
  # o simplemente: pm2 ls
  ```
- **Detener una aplicación:**
  ```bash
  pm2 stop <id_o_nombre>
  # Ejemplo: pm2 stop mi-api-backend
  ```
- **Reiniciar una aplicación:** (Mata el proceso y lo vuelve a iniciar)
  ```bash
  pm2 restart <id_o_nombre>
  ```
- **Recargar una aplicación (Zero-Downtime):** (Ideal para producción, recarga la app sin cortar las conexiones activas)
  ```bash
  pm2 reload <id_o_nombre>
  ```
- **Eliminar una aplicación de PM2:**
  ```bash
  pm2 delete <id_o_nombre>
  ```
- **Aplicar un comando a TODAS las apps al mismo tiempo:**
  ```bash
  pm2 stop all
  pm2 restart all
  pm2 delete all
  ```

### 3. Monitoreo y Logs

Para saber qué está pasando dentro de tu aplicación (errores, `console.log`, uso de memoria).

- **Ver los logs en tiempo real (de todas las apps):**
  ```bash
  pm2 logs
  ```
- **Ver los logs de una app específica:**
  ```bash
  pm2 logs <id_o_nombre>
  ```
- **Limpiar/Borrar el archivo de logs:** (Útil si el archivo se hace muy pesado)
  ```bash
  pm2 flush
  ```
- **Abrir el panel de monitoreo en la terminal:** (Muestra uso de CPU y RAM en tiempo real)
  ```bash
  pm2 monit
  ```

### 4. Auto-Arranque (Sobrevivir a reinicios del servidor)

Si tu servidor (Linux/VPS) se reinicia por una actualización o un fallo, PM2 y tus apps de Node.js no se iniciarán solas por defecto. Necesitas configurarlo:

1. **Generar el script de auto-arranque:**
   ```bash
   pm2 startup
   ```
   _(Este comando te devolverá otro comando que debes copiar y pegar en tu terminal para habilitar el servicio en tu sistema operativo)._
2. **Guardar el estado actual:** (Guarda la lista de apps que están corriendo actualmente para que PM2 sepa qué arrancar la próxima vez).
   ```bash
   pm2 save
   ```

---

### 💡 Pro-Tip: El archivo `ecosystem.config.js`

En entornos profesionales, no se suelen escribir los comandos `pm2 start ...` con todos sus parámetros en la consola. En su lugar, se genera un archivo de configuración.

1. Créalo ejecutando: `pm2 init`
2. Edita el archivo generado (`ecosystem.config.js`) con tus variables de entorno, puertos y configuraciones.
3. Arranca todo tu entorno con un solo comando:
   ```bash
   pm2 start ecosystem.config.js
   ```
