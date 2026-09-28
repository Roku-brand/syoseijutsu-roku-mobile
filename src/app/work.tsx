import { Redirect } from 'expo-router';

export default function WorkScreen() {
  return <Redirect href={{ pathname: '/personas', params: { category: 'work' } }} />;
}
