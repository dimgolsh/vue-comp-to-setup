import { test, expect } from 'vitest';
import { convert } from '../src';
import { clean } from './utils';

test('convert Vue file to script setup', async () => {
	const code = `
    <script lang="ts">
      import { defineComponent, ref } from 'vue';
      export default defineComponent({
        name: 'MyComponent',
        props: {
          modelValue: { type: String, required: true },
        },
        setup(props) {
          const value = ref(props.modelValue);
          return { value };
        },
      });
    </script>
  `;

	const { content } = await convert(code);

	expect(content).toContain('<script setup lang="ts">');
	expect(content).toContain('defineProps');
	expect(content).not.toContain('defineComponent');
});

test('convert Vue file to script setup with import css', async () => {
	const code = `
    <script lang="ts">
      import { defineComponent, ref } from 'vue';
      import 'vue3-virtual-scroller/dist/vue3-virtual-scroller.css';
      export default defineComponent({
        name: 'MyComponent',
        props: {
          modelValue: { type: String, required: true },
        },
        setup(props) {
          const value = ref(props.modelValue);
          return { value };
        },
      });
    </script>
  `;

	const { content } = await convert(code);

	const resultCode = `
 <scriptsetuplang="ts">import{ref}from'vue';import 'vue3-virtual-scroller/dist/vue3-virtual-scroller.css';defineOptions({name:'MyComponent'});constprops=defineProps<{modelValue:string;}>();constvalue=ref(props.modelValue);</script>`;

	expect(clean(content)).toEqual(clean(resultCode));
});

test('convert props to defineProps', async () => {
	const code = `
    <script lang="ts">
      export default {
        props: {
          modelValue: { type: Boolean, default: false },
        },
      };
    </script>
  `;

	const resultCode = `
<script setup lang="ts">
withDefaults(defineProps<{modelValue?: boolean;}>(), {modelValue: false});
</script>`;

	const { content } = await convert(code, { propsOptionsLike: false });

	expect(clean(content)).toEqual(clean(resultCode));
});

test('convert props to defineProps with propsOptionsLike', async () => {
	const code = `
    <script lang="ts">
      export default {
        props: {
          modelValue: { type: Boolean, default: false },
        },
      };
    </script>
  `;

	const resultCode = `
<script setup lang="ts">
defineProps({
 modelValue: {
    type: Boolean,
    default: false
  }
});
</script>`;

	const { content } = await convert(code, { propsOptionsLike: true });

	expect(clean(content)).toEqual(clean(resultCode));
});

test('throws error for invalid Vue file', async () => {
	const content = `<template><div>Hello</div></template>`;

	const result = await convert(content);

	expect(result.content).toBe('');
	expect(result.errors).toEqual(['⚠ Vue file is not contain script']);
});
