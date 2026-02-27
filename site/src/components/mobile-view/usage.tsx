export const examples = {
  vanilla: `const haptics = new WebHaptics();
haptics.trigger(); // light tap
haptics.trigger(defaultPatterns.success);
`,
  react: `const { trigger } = useWebHaptics();

<button onClick={() => trigger()}>Tap me</button>`,
  vue: `<script setup>
  import { useWebHaptics } from "web-haptics/vue";
  const { trigger } = useWebHaptics();
</script>

<template>
  <button @click="trigger()">Tap me</button>
</template>`,
  svelte: `<script>
  import { createWebHaptics } from "web-haptics/svelte";
  import { onDestroy } from "svelte";
  const { trigger, destroy } = createWebHaptics();
  onDestroy(destroy);
</script>

<button on:click={() => trigger()}>Tap me</button>`,
};

export const populateExample = (example: string) => {
  return example;
};
