<script setup lang="ts"></script>

<template>
  <div class="loader"></div>
</template>

<style scoped>
  .loader {
    width: 65px;
    aspect-ratio: 1;
    --g: radial-gradient(
        farthest-side,
        transparent calc(95% - 3px),
        var(--primary) calc(100% - 3px) 98%,
        transparent 101%
      )
      no-repeat;
    background: var(--g), var(--g), var(--g);
    background-size: 30px 30px;
    animation: l10 1.5s infinite;
  }
  @keyframes l10 {
    0% {
      background-position:
        0 0,
        0 100%,
        100% 100%;
    }
    25% {
      background-position:
        100% 0,
        0 100%,
        100% 100%;
    }
    50% {
      background-position:
        100% 0,
        0 0,
        100% 100%;
    }
    75% {
      background-position:
        100% 0,
        0 0,
        0 100%;
    }
    100% {
      background-position:
        100% 100%,
        0 0,
        0 100%;
    }
  }
</style>
