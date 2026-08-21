# Imperio Barber

Antes de hacer cualquier cosa en este proyecto, lee **`ARCHITECTURE.md`** completo — especialmente la sección **"Estado actual y próximos pasos"** al principio. Ahí está qué ya se construyó, qué sigue, y qué se decidió dejar fuera de alcance a propósito (para no reabrir esas discusiones sin que el usuario lo pida).

No leas el archivo de plan en `~/.claude/plans/` como referencia del proyecto — se sobreescribe cada vez que se usa modo plan para otra tarea y puede tener contenido de una tarea vieja sin relación.

Convenciones de este proyecto (no repetir la pregunta, ya están decididas):
- Todo el texto/copy va en **español chileno**, no argentino.
- El usuario hace sus propios `git commit`/`git push` — dejar los archivos listos, no comitear por cuenta propia salvo que lo pida explícitamente.
- Antes de correr comandos con efectos reales (instalar algo, cambiar config, levantar servidores), explicar brevemente qué hace y qué implica.
- Antes de reiniciar backend/frontend local, revisar `ps aux` por procesos viejos de sesiones anteriores compitiendo por el mismo puerto — es un problema recurrente en esta máquina (también hay otros proyectos corriendo en 3000/4200/5432; este proyecto usa 3001/4201/5433 en desarrollo local).
