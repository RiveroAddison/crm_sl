<script setup lang="ts">
defineProps<{
  companyName: string;
  sellerName?: string;
}>();

defineEmits<{
  (e: 'open-prospect-modal'): void;
  (e: 'logout'): void;
}>();
</script>

<template>
  <header class="bg-brand-blue text-white px-6 py-4 flex items-center justify-between shadow-md">
    <div class="flex items-center gap-3">
      <span class="w-3 h-3 bg-brand-green rounded-full inline-block"></span>
      <strong class="text-lg font-bold tracking-tight">{{ companyName }}</strong>
      <span class="bg-brand-blue-light/50 text-sky-200 text-xs px-2.5 py-1 rounded-full uppercase tracking-wider font-semibold">Portal Vendedor</span>
    </div>
    <div class="flex items-center gap-4">
      <span v-if="sellerName" class="text-sm text-sky-100 hidden sm:inline">Vendedor: <b class="text-white">{{ sellerName }}</b></span>
      <button class="bg-brand-green text-brand-ink font-bold px-4 py-2 rounded-lg text-sm transition hover:bg-lime-400 shadow" @click="$emit('open-prospect-modal')">+ Nuevo Prospecto</button>
      <button class="bg-red-600/20 text-red-200 hover:bg-red-600/40 px-3 py-2 rounded-lg text-sm transition" @click="$emit('logout')">Cerrar sesión</button>
    </div>
  </header>
</template>
