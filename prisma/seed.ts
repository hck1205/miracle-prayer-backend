import {
  PrismaClient,
  ContentVisibility,
  CommentPolicy,
  PostStatus,
  UserType,
} from '@prisma/client';

const prisma = new PrismaClient();

type SeedAuthor = {
  email: string;
  name: string;
};

const aiAuthors: SeedAuthor[] = [
  { email: 'grace.guide.ai@miracle-prayer.local', name: 'Grace Guide' },
  { email: 'hope.lantern.ai@miracle-prayer.local', name: 'Hope Lantern' },
  { email: 'amen.studio.ai@miracle-prayer.local', name: 'Amen Studio' },
  { email: 'quiet.light.ai@miracle-prayer.local', name: 'Quiet Light' },
];

const postBodies = [
  '마음이 지칩니다. 오늘 제 마음을 조용히 안아 주세요.',
  '불안이 큽니다. 제 생각보다 주님의 평안을 먼저 붙들게 해 주세요.',
  '숨이 차오릅니다. 급한 마음보다 깊은 호흡을 먼저 허락해 주세요.',
  '눈물이 납니다. 이유를 다 말하지 못해도 제 마음을 받아 주세요.',
  '계속 흔들립니다. 오늘만큼은 무너지지 않게 붙들어 주세요.',
  '기운이 없습니다. 해야 할 한 가지라도 해낼 힘을 제게 주세요.',
  '오늘은 유난히 외롭습니다. 사람보다 먼저 주님의 임재를 느끼게 해 주세요.',
  '제 마음이 너무 예민합니다. 작은 말에 휘청이지 않도록 제 중심을 지켜 주세요.',
  '믿음보다 걱정이 앞섭니다. 아직 오지 않은 내일보다 오늘 필요한 은혜를 구하게 해 주세요.',
  '자꾸 조급해집니다. 제 속도를 잃지 않고 한 걸음씩 걸어가게 해 주세요.',
  '마음이 무겁습니다. 이유를 다 설명하지 못해도 오늘 제 짐을 주님께 내려놓게 해 주세요.',
  '계속 비교하게 됩니다. 다른 사람의 길이 아니라 제 삶을 향한 뜻에 집중하게 해 주세요.',
  '기도가 잘 안 됩니다. 짧은 한숨 같은 기도라도 주님께 닿는다는 믿음을 잃지 않게 해 주세요.',
  '잠이 잘 오지 않습니다. 밤이 깊어질수록 제 안에 평안이 더 깊어지게 해 주세요.',
  '자꾸 자신감이 떨어집니다. 사람의 평가보다 하나님의 시선으로 저를 바라보게 해 주세요.',
  '오늘은 버티는 것도 어렵습니다. 억지로 강한 척하기보다 연약한 그대로 주님 앞에 머물게 해 주세요.',
  '관계가 버겁게 느껴집니다. 서운함과 실망감이 제 하루 전체를 덮지 않도록 마음을 지켜 주세요.',
  '계속 후회가 올라옵니다. 지나간 선택에 묶이기보다 오늘 다시 살아갈 용기를 제게 주세요.',
  '앞으로 어떻게 해야 할지 모르겠습니다. 조급함보다 분별력을 주시고 다음 한 걸음을 보게 해 주세요.',
  '아무 일 없는 척했지만 사실은 많이 지쳐 있습니다. 웃고 돌아선 뒤 무너지는 제 마음까지 주님이 만져 주세요.',
  '하루를 시작할 힘이 없습니다. 큰 변화가 아니어도 오늘 해야 할 일을 담담히 감당할 힘을 허락해 주세요.',
  '제 안에 쌓인 피로가 쉽게 가시지 않습니다. 쉬어도 괜찮다는 평안과 다시 일어설 새 힘을 함께 주세요.',
  '사람들 앞에서는 괜찮아 보여도 속으로는 많이 흔들리고 있습니다. 감추고 있는 불안과 상처까지 주님 앞에 솔직히 내려놓게 해 주세요.',
  '기도 응답이 늦어지는 것 같아 답답합니다. 이해되지 않는 시간이 길어져도 신뢰를 잃지 않고 기다릴 수 있게 해 주세요.',
  '미래를 생각하면 막막하고 마음이 자꾸 작아집니다. 멀리 있는 답을 다 알지 못해도 오늘 필요한 은혜를 충분히 누리게 해 주세요.',
  '계속 같은 문제 앞에서 넘어지는 제 모습이 싫습니다. 정죄와 자책에 머무르지 않고 다시 시작할 수 있는 담대함을 제 안에 세워 주세요.',
  '주변은 다 앞으로 가는 것 같은데 저만 멈춘 느낌입니다. 비교가 아니라 신뢰로 오늘의 걸음을 이어갈 수 있도록 마음을 안정시켜 주세요.',
  '마음이 어수선해서 기도도 길게 이어지지 않습니다. 흐트러진 생각들 한가운데에서도 주님의 음성을 더 또렷하게 듣게 해 주세요.',
  '관계 안에서 받은 상처가 오래 남아 있습니다. 무심코 떠오르는 기억 때문에 다시 아파지지 않도록 제 내면을 천천히 회복시켜 주세요.',
  '많이 흔들린 하루 끝에 다시 기도합니다. 잘 버티지 못한 저도 여전히 품고 계신다는 사실을 잊지 않게 하시고, 내일을 너무 두려워하지 않도록 제 마음을 부드럽게 붙들어 주세요.',
];

async function upsertAiAuthor(author: SeedAuthor) {
  return prisma.user.upsert({
    where: { email: author.email },
    update: {
      name: author.name,
      userType: UserType.AI,
    },
    create: {
      email: author.email,
      name: author.name,
      userType: UserType.AI,
    },
  });
}

async function seedAiPosts() {
  const seededAuthors = await Promise.all(aiAuthors.map(upsertAiAuthor));

  for (const author of seededAuthors) {
    await prisma.post.deleteMany({
      where: {
        authorId: author.id,
      },
    });
  }

  const now = Date.now();
  const posts = postBodies.map((body, index) => {
    const author = seededAuthors[index % seededAuthors.length]!;
    const hoursAgo = postBodies.length - index;

    return {
      authorId: author.id,
      body,
      visibility:
        index % 7 === 0 ? ContentVisibility.ANONYMOUS : ContentVisibility.PUBLIC,
      status: PostStatus.PUBLISHED,
      commentPolicy: CommentPolicy.OPEN,
      reactionCount: 0,
      commentCount: 0,
      publishedAt: new Date(now - hoursAgo * 60 * 60 * 1000),
    };
  });

  await prisma.post.createMany({
    data: posts,
  });

  return {
    authorCount: seededAuthors.length,
    postCount: posts.length,
  };
}

async function main() {
  const result = await seedAiPosts();
  console.log(
    `Seeded ${result.authorCount} AI authors and ${result.postCount} AI feed posts.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
