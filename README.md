# 🏛️ Palacio Barolo — Sistema Web de Gestión de Eventos & Rentabilidad

🌐 **Acceso Web en Vivo (GitHub Pages):**  
👉 **[https://urbanbatesviandas-blip.github.io/calculadoraBarolo/](https://urbanbatesviandas-blip.github.io/calculadoraBarolo/)**
🌐 **Enlaces en Vivo en la Nube:**  
- ⚡ **Vercel:** 👉 **[https://calculadorabarolo.vercel.app](https://calculadorabarolo.vercel.app)**  
- 🐙 **GitHub Pages:** 👉 **[https://urbanbatesviandas-blip.github.io/calculadoraBarolo/](https://urbanbatesviandas-blip.github.io/calculadoraBarolo/)**

> **Última Actualización (v1.2.0)**:
> - 🧮 **Calculadora Oficial Precargada**: Evento **LC-076 Jam de Dibujo (Edición Especial)** de Camila Ocampo precargado por defecto con formato exacto a 2 decimales y costos en centavos (`step="any"`).
> - 🏛️ **Botón "LC-076 Oficial"**: Restauración instantánea de la matriz oficial histórica de liquidación Palacio Barolo.
> - 📄 **Presupuesto Comercial Formal PDF**: Generación e impresión de propuestas comerciales elegantes para clientes con membrete, términos y firma en 1 clic.
> - ⚠️ **Detección de Solapamiento (Double-Booking)**: Alertas visuales inmediatas en Cotizador y Calendario ante reservas conflictivas en el mismo salón y fecha.
> - 🟢 **Sincronización en Nube y Local**: Integración transparente con Supabase y modo local robusto con los eventos históricos oficiales.

---

## 🚀 Características Principales

1. **📅 Calendario Interactivo con Semáforo:**
   - 🟢 **Contratado:** Evento confirmado y cerrado en firme.
   - 🔵 **Reservado:** Fecha bloqueada en negociación con seña pendiente.
   - 🟡 **Cotizado:** Presupuesto enviado en proceso comercial.
   - 🔴 **Cancelado:** Propuesta descartada con registro del motivo de pérdida.
   - Filtros por estado y por salón (*Salón 1923, Espacio Barolo, Terraza piso 13, EB + Cielos*).

2. **🔍 Modal de Rentabilidad por Evento (Drill-Down):**
   - Al hacer clic en cualquier evento del calendario o del listado, se abre un gráfico de rentabilidad (*Waterfall / Barras desglosadas*) mostrando:
     - Facturación Bruta Total
     - Costos Directos (artistas, técnica, catering)
     - Costos Indirectos (limpieza, seguros, salón, marketing)
     - Margen Bruto Operativo y Ganancia Neta Barolo
     - Ratios por asistente: Ganancia x asistente, Costo x asistente, Relación Ingreso/Costo.
   - Botón directo para **Confirmar Evento** con un clic (con animación de confeti).

3. **📊 Dashboard Ejecutivo (Semanal & Mensual):**
   - Métricas clave en tiempo real: Facturación acumulada, Costos directos/indirectos, Ganancia Barolo y Margen %.
   - **Evolución Temporal:** Gráfico configurable entre vista **Semanal** y **Mensual** para analizar ganancias vs costos directos e indirectos.
   - **Embudo Comercial (Funnel):** Gráfico de **Cotizados vs Contratados vs Cancelados** con cálculo de tasa de efectividad en ventas.
   - **Comparativa por Espacio:** Rendimiento económico de cada salón.

4. **🧮 Calculadora Madre Online "Con Esteroides":**
   - Cotizador reactivo en vivo idéntico a las fórmulas maestras de Excel.
   - **Desglose Dinámico de Otros Ingresos:** Agregá o quitá ítems de sponsors, merchandising o canones extras al instante.
   - **Desglose Dinámico de Costos:** Agregá o quitá gastos directos o indirectos con cálculo automático.
   - **Punto de Equilibrio en Vivo:** Calcula cuántas entradas se necesitan vender para cubrir el 100% de los costos.
   - Botón **"📝 GUARDAR COMO COTIZACIÓN"** (aparece en el calendario como 🟡 Cotizado).
   - Botón **"💾 CONFIRMAR EVENTO"** (aparece en el calendario como 🟢 Contratado).

5. **☁️ Supabase (PostgreSQL + Auth + Realtime):**
   - Esquema completo en `supabase/schema.sql` con tablas para eventos, ingresos extras, costos y perfiles.
   - Datos iniciales en `supabase/seed.sql` con los **81 eventos históricos y del pipeline** listos para importar.
   - **Modo Local / Demo automático:** Funciona al 100% desde el primer segundo sin necesidad de configurar Supabase de inmediato.

---

## 💻 Instalación y Uso Local

```bash
# 1. Instalar dependencias
npm install

# 2. Iniciar servidor de desarrollo
npm run dev

# 3. Compilar para producción (genera carpeta /dist)
npm run build
```

---

## ☁️ Conexión con Supabase

1. Creá un proyecto en [supabase.com](https://supabase.com).
2. En el **SQL Editor**, ejecutá `supabase/schema.sql`.
3. Ejecutá `supabase/seed.sql` para cargar los eventos históricos.
4. En la barra superior de la app, hacé clic en el botón de estado **Modo Local** y pegá tu **Project URL** y **Anon Key**.
