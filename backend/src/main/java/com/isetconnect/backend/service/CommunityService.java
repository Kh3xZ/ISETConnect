package com.isetconnect.backend.service;

import com.isetconnect.backend.dto.*;
import com.isetconnect.backend.exception.ApiException;
import com.isetconnect.backend.model.*;
import com.isetconnect.backend.repository.CommunityMemberRepository;
import com.isetconnect.backend.repository.CommunityRepository;
import com.isetconnect.backend.repository.UserRepository;
import com.isetconnect.backend.util.PageUtil;
import lombok.RequiredArgsConstructor;
import org.hibernate.Hibernate;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CommunityService {

    private final CommunityRepository communities;
    private final CommunityMemberRepository members;
    private final UserRepository users;
    private final PasswordEncoder encoder;



    @Transactional(readOnly = true)
    public PageResponse<CommunityResponse> list(User current, String q, Pageable pageable) {
        String term = q == null ? "" : q.trim();
        return PageResponse.of(communities.findByNameContainingIgnoreCase(term, pageable)
                .map(c -> toResponse(c, current)));
    }

    @Transactional(readOnly = true)
    public List<CommunityResponse> mine(User current) {
        return members.findCommunitiesByUserId(current.getId()).stream()
                .map(c -> toResponse(c, current)).toList();
    }

    @Transactional(readOnly = true)
    public CommunityResponse get(Long id, User current) {
        return toResponse(getEntity(id), current);
    }

    @Transactional(readOnly = true)
    public PageResponse<MemberResponse> listMembers(Long id, User current, Pageable pageable) {
        assertCanView(getEntity(id), current);
        return PageResponse.of(members.findByCommunityId(id, pageable).map(MemberResponse::from));
    }



    @Transactional
    public CommunityResponse create(User current, CommunityRequest req) {
        String name = req.name().trim();
        if (communities.existsByNameIgnoreCase(name)) {
            throw ApiException.conflict("A community with this name already exists");
        }
        Community c;
        if (Boolean.TRUE.equals(req.isPrivate())) {
            if (req.key() == null || req.key().isBlank()) {
                throw ApiException.badRequest("A private community needs a key");
            }
            if (req.nbMax() == null || req.nbMax() < 1) {
                throw ApiException.badRequest("A private community needs nbMax >= 1");
            }
            PrivateCommunity pc = new PrivateCommunity();
            pc.setJoinKey(encoder.encode(req.key()));
            pc.setNbMax(req.nbMax());
            c = pc;
        } else {
            c = new PublicCommunity();
        }
        User owner = users.getReferenceById(current.getId());
        c.setName(name);
        c.setDescription(req.description());
        c.setOwner(owner);
        communities.save(c);
        members.save(new CommunityMember(c, owner));
        return toResponse(c, current);
    }

    @Transactional
    public CommunityResponse update(Long id, User current, CommunityRequest req) {
        Community c = getEntity(id);
        assertOwnerOrAdmin(c, current);
        String name = req.name().trim();
        if (!name.equalsIgnoreCase(c.getName()) && communities.existsByNameIgnoreCase(name)) {
            throw ApiException.conflict("A community with this name already exists");
        }
        c.setName(name);
        c.setDescription(req.description());
        if (Hibernate.unproxy(c) instanceof PrivateCommunity pc) {
            if (req.nbMax() != null) {
                if (req.nbMax() < members.countByCommunityId(id)) {
                    throw ApiException.badRequest("nbMax is lower than the current number of members");
                }
                pc.setNbMax(req.nbMax());
            }
            if (req.key() != null && !req.key().isBlank()) {
                pc.setJoinKey(encoder.encode(req.key()));
            }
        }
        return toResponse(communities.save(c), current);
    }

    @Transactional
    public void delete(Long id, User current) {
        Community c = getEntity(id);
        assertOwnerOrAdmin(c, current);
        communities.delete(c);
    }

    @Transactional
    public CommunityResponse join(Long id, User current, JoinRequest req) {
        Community c = getEntity(id);
        if (members.existsByCommunityIdAndUserId(id, current.getId())) {
            throw ApiException.conflict("You are already a member of this community");
        }
        if (Hibernate.unproxy(c) instanceof PrivateCommunity pc) {
            if (req == null || req.key() == null || !encoder.matches(req.key(), pc.getJoinKey())) {
                throw ApiException.forbidden("Invalid community key");
            }
            if (members.countByCommunityId(id) >= pc.getNbMax()) {
                throw ApiException.conflict("This community is full");
            }
        }
        members.save(new CommunityMember(c, users.getReferenceById(current.getId())));
        return toResponse(c, current);
    }

    @Transactional
    public void leave(Long id, User current) {
        Community c = getEntity(id);
        if (c.getOwner().getId().equals(current.getId())) {
            throw ApiException.badRequest("The owner cannot leave; delete the community instead");
        }
        CommunityMember m = members.findByCommunityIdAndUserId(id, current.getId())
                .orElseThrow(() -> ApiException.badRequest("You are not a member of this community"));
        members.delete(m);
    }



    public Community getEntity(Long id) {
        return communities.findById(id).orElseThrow(() -> ApiException.notFound("Community not found"));
    }


    public void assertCanView(Community c, User user) {
        if (!Boolean.TRUE.equals(c.getIsPrivate()) || user.getRole() == Role.ADMIN
                || members.existsByCommunityIdAndUserId(c.getId(), user.getId())) {
            return;
        }
        throw ApiException.forbidden("This community is private. Join it with its key first");
    }

    public void assertMember(Community c, User user) {
        if (!members.existsByCommunityIdAndUserId(c.getId(), user.getId())) {
            throw ApiException.forbidden("Join this community before posting in it");
        }
    }

    public boolean isOwnerOrAdmin(Community c, User user) {
        return user.getRole() == Role.ADMIN || c.getOwner().getId().equals(user.getId());
    }

    private void assertOwnerOrAdmin(Community c, User user) {
        if (!isOwnerOrAdmin(c, user)) {
            throw ApiException.forbidden("Only the community owner or an admin can do this");
        }
    }

    private CommunityResponse toResponse(Community c, User current) {
        Integer nbMax = Hibernate.unproxy(c) instanceof PrivateCommunity pc ? pc.getNbMax() : null;
        return new CommunityResponse(c.getId(), c.getName(), c.getDescription(), c.getIsPrivate(), nbMax,
                members.countByCommunityId(c.getId()),
                members.existsByCommunityIdAndUserId(c.getId(), current.getId()),
                c.getOwner().getId(), c.getCreatedAt());
    }

    public static Pageable membersPage(int page, int size) {
        return PageUtil.of(page, size, Sort.by(Sort.Direction.ASC, "joinedAt"));
    }
}
