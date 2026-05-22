# JT-ORGA UI Components

## Components

### Button
```tsx
<Button variant="primary" size="md" loading={false}>Click</Button>
```

### Input
```tsx
<Input label="Name" error="Required" icon={<User />} />
```

### Modal
```tsx
<Modal isOpen onClose title="Title">Content</Modal>
```

### Skeleton
```tsx
<Skeleton className="h-4 w-full" />
<CardSkeleton lines={3} />
<PageSkeleton />
```

### OfflineBanner
```tsx
<OfflineBanner />
```

## Utilities

### Haptic Feedback
```tsx
hapticFeedback('light' | 'medium' | 'heavy' | 'success' | 'error')
```

### Analytics
```tsx
useWebVitals()
trackPageView('/dashboard')
```

### i18n
```tsx
t('loading')
setLanguage('en')
```
