import type { ActivityTypeComponentProps } from './ActivityTypeRegistry.types';
import { activityTypeRegistry } from './ActivityTypeRegistry';

/**
 * Fallback component for unsupported activity types.
 * Displays a friendly message indicating the activity type is not yet supported.
 */
export function UnsupportedActivityTypeComponent(props: ActivityTypeComponentProps): React.ReactElement {
  const { activity, onRetry } = props;
  const registryEntry = activityTypeRegistry.get(activity.type);

  return (
    <div className="card p-8 text-center">
      <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4 text-4xl">
        {registryEntry?.icon || '📝'}
      </div>
      <h2 className="text-xl font-display font-bold text-gray-900 mb-2">
        {registryEntry?.label || activity.type.replace(/_/g, ' ')}
      </h2>
      <p className="text-gray-600 mb-6">
        This activity type is not yet supported in the current version.
      </p>
      <p className="text-sm text-gray-500 mb-6">
        Type: <code className="bg-gray-100 px-1 rounded">{activity.type}</code>
      </p>
      <button onClick={onRetry} className="btn btn-primary">
        Try Another Activity
      </button>
    </div>
  );
}
