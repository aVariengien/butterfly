import { createShapePropsMigrationIds, createShapePropsMigrationSequence } from 'tldraw'

const versions = createShapePropsMigrationIds(
	// this must match the shape type in the shape definition
	'card',
	{
		AddSomeProperty: 1,
		ReplaceDetailsWithExtraFields: 2,
	}
)

// Migrations for the custom card shape (optional but very helpful)
export const cardShapeMigrations = createShapePropsMigrationSequence({
	sequence: [
		{
			id: versions.AddSomeProperty,
			up(props) {
				// it is safe to mutate the props object here
				props.someProperty = 'some value'
			},
			down(props) {
				delete props.someProperty
			},
		},
		{
			id: versions.ReplaceDetailsWithExtraFields,
			up(props) {
				// Convert details field to extra_fields
				if (props.details !== undefined) {
					props.extra_fields = props.extra_fields || {}
					// Remove the details field since it's no longer supported
					delete props.details
				}
				// Ensure extra_fields exists
				if (!props.extra_fields) {
					props.extra_fields = {}
				}
			},
			down(props) {
				// Convert back from extra_fields to details (for rollback)
				if (props.extra_fields && Object.keys(props.extra_fields).length > 0) {
					props.details = ''
				} else {
					props.details = ''
				}
				delete props.extra_fields
			},
		},
	],
})