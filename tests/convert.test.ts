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
defineProps({
 modelValue: {
    type: Boolean,
    default: false
  }
});
</script>`;

	const { content } = await convert(code);

	expect(clean(content)).toEqual(clean(resultCode));
});


test('convert emits to defineEmits', async () => {
	const code = `
    <script lang="ts">
      export default {
        emits: ['update'],
        setup(props, { emit }) {
          emit('update', true);
        }
      };
    </script>
  `;

	const { content } = await convert(code);

	const expectCode = `<script setup lang="ts">
const emit = defineEmits(['update']);

emit('update', true);
</script>`

	expect(clean(content)).toEqual(clean(expectCode));
});


test('throws error for invalid Vue file', async () => {
	const content = `<template><div>Hello</div></template>`;

	const result = await convert(content);

	expect(result.content).toBe('');
	expect(result.errors).toEqual(['⚠ Vue file is not contain script']);
});