import { BASE_PATH } from '@/lib/constants';
import { IconUser, IconMail, IconListCheck, IconProps, Icon} from '@tabler/icons-react';

//  Profile Data
interface ProfileType {
  title: string;
  img: any;
  subtitle: string;
  url: string;
  icon:string
}


const profileDD: ProfileType[] = [
  {
    img: `${BASE_PATH}/images/svgs/icon-account.svg`,
    title: "Mon profil",
    subtitle: "Paramètres du compte",
    icon: "tabler:user",
    url: "/mon-profil",
  },
];

const Notifications = [
  {
    title: "Roman Joined the Team!",
    subtitle: "Congratulate him",
  },
  {
    title: "New message",
    subtitle: "Salma sent you new message",
  },
  {
    title: "Bianca sent payment",
    subtitle: "Check your earnings",
  },
  {
    title: "Jolly completed tasks",
    subtitle: "Assign her new tasks",
  },
  {
    title: "John received payment",
    subtitle: "$230 deducted from account",
  },
];

export {
  Notifications,
  profileDD,
};
