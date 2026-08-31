<script setup lang="ts">
defineProps<{
  metrics: {
    clientes: number;
    clientesActivos: number;
    crossSelling: number;
  };
}>();
</script>

<template>
  <section class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
    <article class="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between">
      <span class="text-xs uppercase tracking-wider text-slate-500 font-bold">Clientes Totales</span>
      <strong class="text-3xl font-bold text-brand-blue my-2">{{ metrics.clientes }}</strong>
      <small class="text-xs text-slate-400">Asignados en cartera</small>
    </article>
    <article class="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between">
      <span class="text-xs uppercase tracking-wider text-slate-500 font-bold">Clientes Activos</span>
      <strong class="text-3xl font-bold text-brand-blue my-2">{{ metrics.clientesActivos }}</strong>
      <small class="text-xs text-slate-400">Con transacciones recientes</small>
    </article>
    <article class="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between">
      <span class="text-xs uppercase tracking-wider text-slate-500 font-bold">Cross-Selling</span>
      <strong class="text-3xl font-bold text-brand-blue my-2">{{ metrics.crossSelling }}</strong>
      <small class="text-xs text-slate-400">Oportunidades cruzadas</small>
    </article>
  </section>
</template>
