import { Redirect } from 'expo-router';

export default function InterpersonalScreen() {
  return <Redirect href={{ pathname: '/personas', params: { category: 'interpersonal' } }} />;
}
