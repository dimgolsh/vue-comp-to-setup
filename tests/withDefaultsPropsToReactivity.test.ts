import { expect, test } from 'vitest';
import { clean } from './utils';
import { withDefaultsPropsToReactivityProps } from '../src/convert/utils/withDefaultsPropsToReactivity';

test('convert withDefaults to reactivity props', async () => {
	const code = `
const props = withDefaults(defineProps<{
  modelValue?: string | number;
  tooltipText?: string;
  injectKey?: string;
  disabled?: boolean;
  hideTooltip?: boolean;
  defaultPromptText?: string;
}>(), {
  modelValue: '',
  tooltipText: '',
  injectKey: '',
  disabled: false,
  hideTooltip: false,
});
  `;

	const resultCode = `
const {
  modelValue = '',
  tooltipText = '',
  injectKey = '',
  disabled = false,
  hideTooltip = false,
  defaultPromptText
} = defineProps<{
  modelValue?: string | number;
  tooltipText?: string;
  injectKey?: string;
  disabled?: boolean;
  hideTooltip?: boolean;
  defaultPromptText?: string;
}>();
`;

	const { content } = await withDefaultsPropsToReactivityProps(code);

	expect(clean(content)).toEqual(clean(resultCode));
});

test('convert withDefaults to reactivity props without props', async () => {
	const code = `
withDefaults(defineProps<{
  modelValue?: string | number;
  tooltipText?: string;
  injectKey?: string;
  disabled?: boolean;
  hideTooltip?: boolean;
  defaultPromptText?: string;
}>(), {
  modelValue: '',
  tooltipText: '',
  injectKey: '',
  disabled: false,
  hideTooltip: false,
  defaultPromptText: ''
});
  `;

	const resultCode = `
const {
  modelValue = '',
  tooltipText = '',
  injectKey = '',
  disabled = false,
  hideTooltip = false,
  defaultPromptText = ''
} = defineProps<{
  modelValue?: string | number;
  tooltipText?: string;
  injectKey?: string;
  disabled?: boolean;
  hideTooltip?: boolean;
  defaultPromptText?: string;
}>();
`;

	const { content } = await withDefaultsPropsToReactivityProps(code);

	expect(clean(content)).toEqual(clean(resultCode));
});

test('convert withDefaults to reactivity props sfc component', async () => {
	const code = `
<script setup lang="ts">
const props = withDefaults(defineProps<{
  modelValue?: string | number;
  tooltipText?: string;
  injectKey?: string;
  disabled?: boolean;
  hideTooltip?: boolean;
  defaultPromptText?: string;
}>(), {
  modelValue: '',
  tooltipText: '',
  injectKey: '',
  disabled: false,
  hideTooltip: false
});

const value = ref(props.modelValue);
</script>
  `;

	const resultCode = `
<script setup lang="ts">
const {
  modelValue = '',
  tooltipText = '',
  injectKey = '',
  disabled = false,
  hideTooltip = false,
  defaultPromptText
} = defineProps<{
  modelValue?: string | number;
  tooltipText?: string;
  injectKey?: string;
  disabled?: boolean;
  hideTooltip?: boolean;
  defaultPromptText?: string;
}>();

const value = ref(modelValue);
</script>
`;

	const { content } = await withDefaultsPropsToReactivityProps(code);

	expect(clean(content)).toEqual(clean(resultCode));
});


test('convert defineProps to reactivity props', async () => {
	const code = `
defineProps<{
  modelValue?: string | number;
  tooltipText?: string;
  injectKey?: string;
  disabled?: boolean;
  hideTooltip?: boolean;
  defaultPromptText?: string;
}>();
  `;

	const resultCode = `
const {
  modelValue,
  tooltipText,
  injectKey,
  disabled,
  hideTooltip,
  defaultPromptText
} = defineProps<{
  modelValue?: string | number;
  tooltipText?: string;
  injectKey?: string;
  disabled?: boolean;
  hideTooltip?: boolean;
  defaultPromptText?: string;
}>();
`;

	const { content } = await withDefaultsPropsToReactivityProps(code);

	expect(clean(content)).toEqual(clean(resultCode));
});